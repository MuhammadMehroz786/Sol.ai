import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Lock, User, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import soleLogoWithTagline from "@/assets/sole-logo-orange-brown-v2.png";

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to Sole Central Station",
      });
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signUp(email, password, displayName);
    
    if (error) {
      setError(error.message);
    } else {
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="group relative mx-auto w-fit">
            <div className="absolute -inset-3 bg-gradient-primary rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
            <div className="relative h-24 w-auto px-16 py-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary-glow/5 backdrop-blur-sm border border-primary/10 flex items-center justify-center hover-scale transition-all duration-300 hover:shadow-glow">
              <img 
                src={soleLogoWithTagline} 
                alt="SOLE - Born for Us. Raised by the Culture" 
                className="h-20 w-auto"
              />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sole Central Station</h1>
            <p className="text-muted-foreground">Access your AI content orchestration platform</p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="bg-gradient-card border border-border shadow-elegant">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Password</span>
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Display Name (Optional)</span>
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Password</span>
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />

            <div className="text-center">
              <Link 
                to="/" 
                className="inline-flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;