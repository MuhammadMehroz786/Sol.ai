import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TodaysSignals } from "@/components/dashboard/TodaysSignals";
import { ContentQueue } from "@/components/dashboard/ContentQueue";
import { ContentGenerator } from "@/components/dashboard/ContentGenerator";
import { GeneratedContentModal, DEFAULT_GUARDRAILS, type Guardrails } from "@/components/dashboard/GeneratedContentModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText, Clock, CheckCircle, Sparkles,
  Activity, ArrowUpRight, Zap, TrendingUp,
} from "lucide-react";

interface ContentOutput {
  id: string;
  title: string;
  content: string;
  persona: string;
  output_type: string;
  status: string;
  topic_context?: string;
  created_at: string;
}

/* ─── Pipeline content viewer (top-level, never nested inside another Dialog) ─── */
const ContentQueueViewer = ({
  open, output, voiceId, guardrails, onClose, onRefresh
}: {
  open: boolean;
  output: ContentOutput;
  voiceId: string;
  guardrails: Guardrails | null;
  onClose: () => void;
  onRefresh: () => void;
}) => (
  <GeneratedContentModal
    open={open}
    onOpenChange={(o) => { if (!o) onClose(); }}
    contentId={output.id}
    title={output.title}
    initialContent={output.content}
    persona={output.persona}
    voiceId={voiceId || output.persona}
    outputType={output.output_type}
    initialStatus={output.status}
    topicContext={output.topic_context}
    createdAt={output.created_at}
    guardrails={guardrails ?? DEFAULT_GUARDRAILS}
    onRefresh={onRefresh}
  />
);

/* ─── count-up hook ─── */
function useCountUp(target: number) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const d = target - prev.current;
    if (!d) return;
    const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - t0) / 800, 1);
      setV(Math.round(prev.current + d * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(run); else prev.current = target;
    };
    requestAnimationFrame(run);
  }, [target]);
  return v;
}

/* ─── stat card ─── */
interface StatProps { icon: React.ElementType; label: string; value: number; sub: string; accent: string; glowColor: string; pulse?: boolean }
const StatCard = ({ icon: Icon, label, value, sub, accent, glowColor, pulse }: StatProps) => {
  const n = useCountUp(value);
  return (
    <div className={`group relative overflow-hidden rounded-2xl border bg-white/70 backdrop-blur-md shadow-elegant hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 ${accent}`}>
      {/* Shimmer sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
      {/* Glow bleed */}
      <div className={`absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${glowColor}`} />
      <div className="relative p-5 flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm ${glowColor} bg-opacity-20`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-55 mb-0.5">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tabular-nums leading-none">{n}</span>
            {pulse && <span className="flex items-center gap-1 text-[10px] font-semibold opacity-60"><span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />live</span>}
          </div>
          <p className="text-[11px] opacity-50 mt-0.5 truncate">{sub}</p>
        </div>
      </div>
    </div>
  );
};

/* ─── launcher tile ─── */
interface TileProps { icon: React.ElementType; title: string; desc: string; meta: string; from: string; to: string; borderColor: string; iconGrad: string; textColor: string; onClick: () => void }
const LaunchTile = ({ icon: Icon, title, desc, meta, from, to, borderColor, iconGrad, textColor, onClick }: TileProps) => (
  <button onClick={onClick} className={`group relative w-full text-left overflow-hidden rounded-2xl border ${borderColor} bg-gradient-to-br ${from} ${to} transition-all duration-300 hover:scale-[1.025] hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
    {/* Animated gradient border */}
    <div className={`absolute inset-0 rounded-2xl border ${borderColor} opacity-0 group-hover:opacity-100 animate-gradient-shift transition-opacity duration-300`} />
    {/* Shimmer */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-600 ease-in-out pointer-events-none" />
    <div className="relative p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md bg-gradient-to-br ${iconGrad}`}>
          <Icon className="h-5 w-5 text-white drop-shadow" />
        </div>
        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
      <h3 className={`font-black text-base mb-1 ${textColor}`}>{title}</h3>
      <p className={`text-[12px] leading-relaxed mb-3 opacity-65 ${textColor}`}>{desc}</p>
      <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/40 border border-white/50 rounded-full px-3 py-1 ${textColor}`}>
        <Zap className="h-3 w-3" />{meta}
      </div>
    </div>
  </button>
);

/* ─── main component ─── */
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalGenerated: 0, inQueue: 0, inReview: 0, publishedToday: 0 });
  const [genOpen, setGenOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [pendingDraftId, setPendingDraftId] = useState<string | null>(null);
  const [pipelineContentOpen, setPipelineContentOpen] = useState(false);
  const [pipelineSelectedOutput, setPipelineSelectedOutput] = useState<ContentOutput | null>(null);
  const [pipelineVoiceId, setPipelineVoiceId] = useState("");
  const [pipelineGuardrails, setPipelineGuardrails] = useState<Guardrails | null>(null);

  const fetchStats = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("content_outputs").select("status, updated_at").eq("user_id", user.id);
    if (error || !data) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    setStats({
      totalGenerated: data.length,
      inQueue: data.filter(c => ["draft","review","final"].includes(c.status)).length,
      inReview: data.filter(c => c.status === "review").length,
      publishedToday: data.filter(c => c.status === "published" && new Date(c.updated_at) >= today).length,
    });
  };

  useEffect(() => { if (user) fetchStats(); }, [user]);
  useEffect(() => {
    const s = () => fetchStats();
    const d = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id ?? null;
      setPendingDraftId(id);
      setGenOpen(false);
      // Do NOT open the pipeline — the always-mounted ContentQueue handles the viewer
    };
    window.addEventListener("statsRefresh", s);
    window.addEventListener("openDraftModal", d);
    return () => { window.removeEventListener("statsRefresh", s); window.removeEventListener("openDraftModal", d); };
  }, [user]);

  const hr = new Date().getHours();
  const greeting = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative space-y-5 animate-fade-in">

      {/* ── Ambient orbs (purely decorative) ── */}
      <div className="pointer-events-none fixed top-36 right-1/4 w-[520px] h-[520px] rounded-full bg-primary/6 blur-[120px] opacity-70" style={{animation:"float 14s ease-in-out infinite"}} />
      <div className="pointer-events-none fixed bottom-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-violet-400/5 blur-[100px] opacity-60" style={{animation:"float 18s ease-in-out 4s infinite"}} />
      <div className="pointer-events-none fixed top-1/2 right-16 w-[300px] h-[300px] rounded-full bg-emerald-400/5 blur-[90px] opacity-50" style={{animation:"float 20s ease-in-out 8s infinite"}} />

      {/* ══════════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 shadow-elevated">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(21,58%,44%)] via-[hsl(20,55%,38%)] to-[hsl(15,48%,26%)]" />
        <div className="absolute inset-0 opacity-25" style={{backgroundImage:"radial-gradient(ellipse at 0% 50%, rgba(255,210,130,0.6) 0%, transparent 55%), radial-gradient(ellipse at 100% 50%, rgba(255,255,255,0.15) 0%, transparent 50%)"}} />
        <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage:"repeating-linear-gradient(45deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 32px)"}} />
        {/* Animated shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-shimmer pointer-events-none" />

        <div className="relative flex items-center gap-5 px-6 py-4">

          {/* Identity */}
          <div className="flex-shrink-0">
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-black text-white tracking-tight leading-none">Central Station</h1>
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">by SOLE</span>
            </div>
            <p className="text-white/55 text-[11px] mt-0.5 font-medium">Born for Us. Raised by the Culture.</p>
          </div>

          {/* Pipeline decoration — centre */}
          <div className="flex-1 flex items-center justify-center gap-1.5 mx-4">
            {[
              { icon: TrendingUp,  label: "Signals",  c: "bg-amber-400/15   border-amber-300/25"   },
              { icon: Zap,         label: "Generate", c: "bg-violet-400/15  border-violet-300/25"  },
              { icon: Activity,    label: "Review",   c: "bg-sky-400/15     border-sky-300/25"     },
              { icon: CheckCircle, label: "Publish",  c: "bg-emerald-400/15 border-emerald-300/25" },
            ].map(({ icon: PIcon, label, c }, i, arr) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1.5 border backdrop-blur-sm rounded-lg px-2 py-1 ${c}`}>
                  <PIcon className="h-3 w-3 text-white/70" />
                  <span className="text-[10px] font-semibold text-white/70 hidden sm:inline">{label}</span>
                </div>
                {i < arr.length - 1 && <div className="w-3 h-px bg-white/20" />}
              </div>
            ))}
          </div>

          {/* Right: greeting + live queue badge */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-white/55 text-[11px] font-medium leading-none mb-0.5">{greeting}</p>
              <p className="text-white font-black text-[15px] leading-none">
                {user?.user_metadata?.display_name || user?.email?.split("@")[0]}
              </p>
            </div>

            {stats.inQueue > 0 && (
              <>
                <div className="h-8 w-px bg-white/15" />
                <button
                  onClick={() => setQueueOpen(true)}
                  className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/35 text-amber-100 rounded-xl px-2.5 py-2 text-[11px] font-bold hover:bg-amber-400/35 transition-colors"
                >
                  <Clock className="h-3 w-3" />{stats.inQueue} in queue
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════
          STATS ROW
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Clock}        label="In Queue"        value={stats.inQueue}        sub={`${stats.inReview} awaiting review`}  accent="border-amber-200/80"   glowColor="bg-amber-400/15"   textColor="text-amber-800" pulse />
        <StatCard icon={CheckCircle}  label="Published Today" value={stats.publishedToday} sub="pieces live today"                     accent="border-emerald-200/80" glowColor="bg-emerald-400/15" textColor="text-emerald-800" />
        <StatCard icon={FileText}     label="Total Generated" value={stats.totalGenerated} sub="all-time content pieces"               accent="border-primary/20"     glowColor="bg-primary/10"     textColor="text-[hsl(15,48%,28%)]" />
      </div>

      {/* ══════════════════════════════════════════
          MAIN GRID
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-5">

        {/* ── Signals panel (8 cols) ── */}
        <div className="col-span-12 lg:col-span-8">
          <div className="relative rounded-3xl border border-primary/20 bg-white/75 backdrop-blur-md overflow-hidden shadow-elegant">
            {/* Animated gradient top border */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-accent to-transparent animate-gradient-shift" style={{backgroundSize:"200% 100%"}} />
            <div className="p-5 pt-6">
              <TodaysSignals />
            </div>
          </div>
        </div>

        {/* ── Right column (4 cols) ── */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">

          {/* Generator tile */}
          <LaunchTile
            icon={Sparkles}
            title="Content Generator"
            desc="Generate AI-powered articles, tweet threads, scripts and daily prompts from your signals."
            meta="Open Generator"
            from="from-violet-50/90" to="to-purple-100/70"
            borderColor="border-violet-200/80"
            iconGrad="from-violet-500 to-purple-700"
            textColor="text-violet-900"
            onClick={() => setGenOpen(true)}
          />

          {/* Queue tile */}
          <LaunchTile
            icon={Activity}
            title="Content Pipeline"
            desc="Review drafts, advance content through your workflow, and publish when ready."
            meta={stats.inQueue > 0 ? `${stats.inQueue} items waiting` : "Open Pipeline"}
            from="from-emerald-50/90" to="to-teal-100/70"
            borderColor="border-emerald-200/80"
            iconGrad="from-emerald-500 to-teal-700"
            textColor="text-emerald-900"
            onClick={() => setQueueOpen(true)}
          />

          {/* Brand accent card */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-[hsl(40,60%,97%)] via-white to-[hsl(30,50%,96%)] p-4 shadow-sm">
            {/* Faint radial glow */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Pro Tip</p>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Hit <strong className="text-foreground">Generate Content</strong> on any signal to instantly draft AI content — it lands straight in your pipeline.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Always-mounted ContentQueue — hidden from view but listens for openDraftModal
          and opens its viewer Dialog (portal) without the pipeline wrapper */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <ContentQueue
          pendingOpenId={pendingDraftId}
          onDraftOpened={() => setPendingDraftId(null)}
        />
      </div>

      {/* ══════════════════════════════════════════
          FLOATING WINDOW — CONTENT GENERATOR
      ══════════════════════════════════════════ */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-primary/25 shadow-2xl shadow-primary/15 ring-1 ring-primary/8 flex flex-col max-h-[90vh] p-0 gap-0 rounded-2xl overflow-hidden [&>button:last-child]:hidden">
          <ContentGenerator onClose={() => setGenOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
          FLOATING WINDOW — CONTENT PIPELINE
      ══════════════════════════════════════════ */}
      <Dialog open={queueOpen} onOpenChange={setQueueOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-card border border-border/60 shadow-elegant rounded-3xl p-0 gap-0">

          {/* Top accent line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-primary/60 via-accent to-primary/60 shrink-0 rounded-t-3xl" />

          {/* Single header */}
          <div className="px-6 pt-5 pb-4 bg-gradient-surface border-b border-border/40 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/20 border border-primary/20 shadow-sm">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-[17px] font-black text-foreground tracking-tight leading-tight">Content Pipeline</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {['Draft', 'Review', 'Final', 'Published'].map((s, i, arr) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">{s}</span>
                        {i < arr.length - 1 && <span className="text-border text-[10px]">›</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {stats.inQueue > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
                    {stats.inQueue} in queue
                  </div>
                )}
                {stats.inReview > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                    {stats.inReview} in review
                  </div>
                )}
                {stats.publishedToday > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-sm">
                    <CheckCircle className="h-3 w-3" />
                    {stats.publishedToday} published today
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Body — filters are static inside ContentQueue, only records scroll */}
          <div className="flex flex-col flex-1 min-h-0">
            <ContentQueue
              embedded
              onOpenContent={(output, voiceId, guardrails) => {
                setQueueOpen(false);
                setPipelineSelectedOutput(output);
                setPipelineVoiceId(voiceId ?? "");
                setPipelineGuardrails(guardrails ?? null);
                setPipelineContentOpen(true);
              }}
            />
          </div>

        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════
          PIPELINE — CONTENT VIEWER (top-level, no nesting)
      ══════════════════════════════════════════ */}
      {pipelineSelectedOutput && (
        <ContentQueueViewer
          open={pipelineContentOpen}
          output={pipelineSelectedOutput}
          voiceId={pipelineVoiceId}
          guardrails={pipelineGuardrails}
          onClose={() => {
            setPipelineContentOpen(false);
            setPipelineSelectedOutput(null);
            setQueueOpen(true);
          }}
          onRefresh={fetchStats}
        />
      )}

    </div>
  );
};

export default Dashboard;
