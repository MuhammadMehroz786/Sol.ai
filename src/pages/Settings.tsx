import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  UserCircle,
  Shield,
  AlertTriangle,
  Camera,
  Save,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  LogOut,
  Trash2,
  Calendar,
  Mail,
  Monitor,
} from 'lucide-react';

type SettingsSection = 'profile' | 'security' | 'danger';

const Settings = () => {
  const { user, session, updatePassword, updateProfile, signOutAllDevices, deleteAccount } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section navigation
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Danger zone state
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [signOutAllLoading, setSignOutAllLoading] = useState(false);

  // Load profile data
  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      setDisplayName(meta.display_name || user.email?.split('@')[0] || '');
      setAvatarUrl(meta.avatar_url || '');
      setAvatarPreview(meta.avatar_url || '');
    }
  }, [user]);

  // Load display name from profiles table as fallback
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.display_name && !user.user_metadata?.display_name) {
        setDisplayName(data.display_name);
      }
    };
    loadProfile();
  }, [user]);

  // Password strength
  const getPasswordStrength = (pw: string): { level: number; label: string; color: string } => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 2) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: 'Medium', color: 'bg-amber-500' };
    if (score <= 4) return { level: 3, label: 'Strong', color: 'bg-emerald-500' };
    return { level: 4, label: 'Very Strong', color: 'bg-emerald-600' };
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = confirmPassword && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword && newPassword !== confirmPassword;

  // Avatar upload handler — uploads to Supabase Storage, stores URL (not base64)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please choose an image under 2MB', variant: 'destructive' });
      return;
    }

    // Show preview immediately while uploading
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setAvatarPreview(user.user_metadata?.avatar_url || '');
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    setAvatarUrl(publicUrl);
    setAvatarPreview(publicUrl);
    setProfileDirty(true);
  };

  // Save profile
  const handleSaveProfile = async () => {
    setProfileLoading(true);
    const { error } = await updateProfile({
      displayName: displayName.trim(),
      avatarUrl: avatarUrl,
    });

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated', description: 'Your changes have been saved' });
      setProfileDirty(false);
    }
    setProfileLoading(false);
  };

  // Change password
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords don\'t match', description: 'Please make sure both passwords are identical', variant: 'destructive' });
      return;
    }

    setPasswordLoading(true);
    const { error } = await updatePassword(newPassword);

    if (error) {
      toast({ title: 'Password change failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password changed', description: 'Your password has been updated successfully' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordLoading(false);
  };

  // Sign out all devices
  const handleSignOutAll = async () => {
    setSignOutAllLoading(true);
    const { error } = await signOutAllDevices();
    if (error) {
      toast({ title: 'Sign out failed', description: error.message, variant: 'destructive' });
      setSignOutAllLoading(false);
    } else {
      navigate('/auth');
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail.toLowerCase() !== user?.email?.toLowerCase()) return;
    setDeleteLoading(true);
    const { error } = await deleteAccount();
    if (error) {
      toast({ title: 'Account deletion failed', description: error.message, variant: 'destructive' });
      setDeleteLoading(false);
    } else {
      navigate('/auth');
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: UserCircle, description: 'Your identity' },
    { id: 'security' as const, label: 'Security', icon: Shield, description: 'Password & sessions' },
    { id: 'danger' as const, label: 'Danger Zone', icon: AlertTriangle, description: 'Irreversible actions' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Header */}
      <div className="relative mb-8 rounded-[2rem] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/80" />
        <div className="relative px-8 py-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 -m-2 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-2xl opacity-50" />
              <div className="relative p-4 bg-white/90 rounded-2xl shadow-[0_8px_24px_rgba(208,126,59,0.2)] border-2 border-primary/20">
                <UserCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] via-[hsl(15,48%,25%)] to-[hsl(21,58%,45%)] bg-clip-text text-transparent">
                Account Settings
              </h1>
              <p className="text-[hsl(15,48%,35%)] font-bold mt-1">
                Manage your profile, security, and account preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar Navigation */}
        <div className="w-64 shrink-0">
          <div className="sticky top-36">
            <div className="relative bg-white/98 rounded-[2rem] shadow-[0_4px_20px_rgba(208,126,59,0.12),0_0_0_1px_rgba(208,126,59,0.1)] border-2 border-primary/15 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary via-accent to-transparent" />

              <div className="relative p-4 space-y-2">
                {sections.map((section, index) => {
                  const isActive = activeSection === section.id;
                  const isDanger = section.id === 'danger';
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left font-bold transition-all duration-300 group/item relative overflow-hidden ${
                        isActive
                          ? isDanger
                            ? 'bg-gradient-to-r from-red-500/15 to-red-400/10 text-red-700 shadow-[0_4px_12px_rgba(185,28,28,0.15)] border-2 border-red-300/30'
                            : 'bg-gradient-to-r from-primary via-[hsl(26,47%,70%)] to-primary text-white shadow-[0_8px_24px_rgba(208,126,59,0.35)]'
                          : isDanger
                            ? 'text-red-600/70 hover:bg-red-50/80 hover:text-red-700 border-2 border-transparent hover:border-red-200/30'
                            : 'text-[hsl(15,48%,30%)] hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 border-2 border-transparent hover:border-primary/15'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {isActive && !isDanger && (
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 blur-xl -z-10" />
                      )}
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        isActive
                          ? isDanger
                            ? 'bg-red-500/15'
                            : 'bg-white/25 shadow-[0_4px_12px_rgba(255,255,255,0.2)]'
                          : isDanger
                            ? 'bg-red-500/8 group-hover/item:bg-red-500/15'
                            : 'bg-primary/10 group-hover/item:bg-primary/18'
                      }`}>
                        <section.icon className={`h-5 w-5 transition-all duration-300 ${
                          isActive
                            ? isDanger ? 'text-red-600' : 'text-white'
                            : isDanger ? 'text-red-500/70' : 'text-primary'
                        }`} />
                      </div>
                      <div>
                        <div className="text-sm">{section.label}</div>
                        <div className={`text-xs font-medium ${
                          isActive
                            ? isDanger ? 'text-red-600/70' : 'text-white/70'
                            : 'text-muted-foreground'
                        }`}>
                          {section.description}
                        </div>
                      </div>
                      {isActive && !isDanger && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="space-y-6 animate-fade-in">
              {/* Avatar Card */}
              <Card className="relative bg-white/98 border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.12)] rounded-[2rem] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <CardHeader className="relative">
                  <CardTitle className="text-xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] to-[hsl(15,48%,25%)] bg-clip-text text-transparent">
                    Profile Photo
                  </CardTitle>
                  <CardDescription className="font-medium">
                    Your avatar is visible across the platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-center gap-8">
                    {/* Avatar with upload */}
                    <div className="relative group/avatar">
                      <div className="absolute inset-0 -m-2 rounded-full bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-xl opacity-40 group-hover/avatar:opacity-70 transition-all duration-500" />
                      <div className="absolute inset-0 -m-0.5 rounded-full bg-gradient-to-br from-primary via-accent to-primary p-[2px] animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}>
                        <div className="w-full h-full rounded-full bg-white" />
                      </div>
                      <Avatar className="relative h-24 w-24 border-2 border-white shadow-[0_8px_24px_rgba(208,126,59,0.25)]">
                        <AvatarImage src={avatarPreview} />
                        <AvatarFallback className="bg-gradient-to-br from-primary via-[hsl(26,47%,70%)] to-primary text-white text-2xl font-black">
                          {displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-full bg-black/0 group-hover/avatar:bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 cursor-pointer"
                      >
                        <Camera className="h-6 w-6 text-white drop-shadow-lg" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-[hsl(15,48%,25%)]">Upload a new photo</p>
                      <p className="text-sm text-muted-foreground">JPG, PNG, or WebP. Max 2MB.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary/30 font-bold"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Details Card */}
              <Card className="relative bg-white/98 border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.12)] rounded-[2rem] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <CardHeader className="relative">
                  <CardTitle className="text-xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] to-[hsl(15,48%,25%)] bg-clip-text text-transparent">
                    Profile Details
                  </CardTitle>
                  <CardDescription className="font-medium">
                    Update your personal information
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative space-y-6">
                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="display-name" className="flex items-center gap-2 font-bold text-[hsl(15,48%,25%)]">
                      <UserCircle className="h-4 w-4 text-primary" />
                      Display Name
                    </Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => { setDisplayName(e.target.value); setProfileDirty(true); }}
                      placeholder="Your display name"
                      className="rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20 bg-white"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-bold text-[hsl(15,48%,25%)]">
                      <Mail className="h-4 w-4 text-primary" />
                      Email Address
                    </Label>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-primary/10">
                      <span className="text-[hsl(15,48%,30%)] font-medium">{user?.email}</span>
                      <span className="ml-auto text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">Verified</span>
                    </div>
                  </div>

                  {/* Member Since */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-bold text-[hsl(15,48%,25%)]">
                      <Calendar className="h-4 w-4 text-primary" />
                      Member Since
                    </Label>
                    <div className="px-4 py-3 rounded-xl bg-muted/50 border border-primary/10">
                      <span className="text-[hsl(15,48%,30%)] font-medium">{memberSince}</span>
                    </div>
                  </div>

                  <Separator className="bg-gradient-to-r from-transparent via-primary/20 to-transparent h-[2px]" />

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={!profileDirty || profileLoading}
                      className="bg-gradient-primary hover:shadow-glow transition-all duration-300 rounded-xl px-6 font-bold disabled:opacity-50"
                    >
                      {profileLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save Changes
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-6 animate-fade-in">
              {/* Change Password Card */}
              <Card className="relative bg-white/98 border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.12)] rounded-[2rem] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <CardHeader className="relative">
                  <CardTitle className="text-xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] to-[hsl(15,48%,25%)] bg-clip-text text-transparent">
                    Change Password
                  </CardTitle>
                  <CardDescription className="font-medium">
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative space-y-6">
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="flex items-center gap-2 font-bold text-[hsl(15,48%,25%)]">
                      <Lock className="h-4 w-4 text-primary" />
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20 bg-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="space-y-1.5 animate-fade-in">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                level <= passwordStrength.level
                                  ? passwordStrength.color
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs font-bold ${
                          passwordStrength.level <= 1 ? 'text-red-500' :
                          passwordStrength.level <= 2 ? 'text-amber-500' :
                          'text-emerald-500'
                        }`}>
                          {passwordStrength.label}
                          {passwordStrength.level < 3 && (
                            <span className="text-muted-foreground font-medium ml-2">
                              — Try adding {newPassword.length < 12 ? 'more characters' : /[^A-Za-z0-9]/.test(newPassword) ? 'uppercase letters' : 'special characters'}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="flex items-center gap-2 font-bold text-[hsl(15,48%,25%)]">
                      <Lock className="h-4 w-4 text-primary" />
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className={`rounded-xl border-primary/20 focus:border-primary/40 focus:ring-primary/20 bg-white pr-10 ${
                          passwordsMismatch ? 'border-red-400 focus:border-red-400' : ''
                        } ${passwordsMatch ? 'border-emerald-400 focus:border-emerald-400' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {passwordsMatch && (
                      <p className="text-xs font-bold text-emerald-500 flex items-center gap-1 animate-fade-in">
                        <Check className="h-3 w-3" /> Passwords match
                      </p>
                    )}
                    {passwordsMismatch && (
                      <p className="text-xs font-bold text-red-500 flex items-center gap-1 animate-fade-in">
                        <X className="h-3 w-3" /> Passwords don't match
                      </p>
                    )}
                  </div>

                  <Separator className="bg-gradient-to-r from-transparent via-primary/20 to-transparent h-[2px]" />

                  <div className="flex justify-end">
                    <Button
                      onClick={handleChangePassword}
                      disabled={!newPassword || !confirmPassword || passwordsMismatch || passwordLoading}
                      className="bg-gradient-primary hover:shadow-glow transition-all duration-300 rounded-xl px-6 font-bold disabled:opacity-50"
                    >
                      {passwordLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Updating...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Update Password
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Active Session Card */}
              <Card className="relative bg-white/98 border-2 border-primary/15 shadow-[0_4px_20px_rgba(208,126,59,0.12)] rounded-[2rem] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                <CardHeader className="relative">
                  <CardTitle className="text-xl font-black bg-gradient-to-r from-[hsl(21,58%,45%)] to-[hsl(15,48%,25%)] bg-clip-text text-transparent">
                    Active Session
                  </CardTitle>
                  <CardDescription className="font-medium">
                    Your current login session
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-emerald-50/40 border-2 border-emerald-200/40">
                    <div className="p-3 rounded-xl bg-emerald-100/80">
                      <Monitor className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[hsl(15,48%,25%)]">Current Browser</p>
                      <p className="text-sm text-muted-foreground">
                        Signed in as <span className="font-semibold">{user?.email}</span>
                      </p>
                      {session?.expires_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Session expires: {new Date(session.expires_at * 1000).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-emerald-600">Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Danger Zone Section */}
          {activeSection === 'danger' && (
            <div className="space-y-6 animate-fade-in">
              {/* Warning Banner */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50/80 border-2 border-red-200/40">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm font-bold text-red-700">
                  Actions in this section are permanent and cannot be undone. Please proceed with caution.
                </p>
              </div>

              {/* Sign Out All Devices */}
              <Card className="relative bg-white/98 border-2 border-red-200/30 shadow-[0_4px_20px_rgba(185,28,28,0.08)] rounded-[2rem] overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-400/40 to-transparent" />
                <CardContent className="relative py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200/30">
                        <LogOut className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <h3 className="font-black text-[hsl(15,48%,25%)]">Sign Out All Devices</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          This will sign you out from all browsers and devices
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="rounded-xl border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-bold"
                        >
                          Sign Out All
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl border-2 border-red-200/40">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-black">Sign out all devices?</AlertDialogTitle>
                          <AlertDialogDescription>
                            You will be signed out of every active session including this one. You'll need to sign in again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleSignOutAll}
                            disabled={signOutAllLoading}
                            className="bg-red-600 hover:bg-red-700 rounded-xl font-bold"
                          >
                            {signOutAllLoading ? 'Signing out...' : 'Sign Out All Devices'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              {/* Delete Account */}
              <Card className="relative bg-white/98 border-2 border-red-300/40 shadow-[0_4px_20px_rgba(185,28,28,0.12)] rounded-[2rem] overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                <CardContent className="relative py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-red-50 border border-red-300/40">
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-black text-red-700">Delete Account</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Permanently delete your account and all associated data
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="rounded-xl border-red-400 text-red-700 hover:bg-red-50 hover:border-red-500 font-bold"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl border-2 border-red-300/50">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-black text-red-700">Delete your account?</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-3">
                            <span className="block">
                              This action is <span className="font-bold text-red-600">permanent and irreversible</span>. All your data including content, signals, agents, and voice profiles will be deleted.
                            </span>
                            <span className="block font-bold text-[hsl(15,48%,25%)]">
                              Type your email to confirm:
                            </span>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Input
                          value={deleteConfirmEmail}
                          onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                          placeholder={user?.email || 'your@email.com'}
                          className="rounded-xl border-red-200 focus:border-red-400 focus:ring-red-200"
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl font-bold" onClick={() => setDeleteConfirmEmail('')}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmEmail.toLowerCase() !== user?.email?.toLowerCase() || deleteLoading}
                            className="bg-red-600 hover:bg-red-700 rounded-xl font-bold disabled:opacity-50"
                          >
                            {deleteLoading ? 'Deleting...' : 'Permanently Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
