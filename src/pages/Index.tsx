import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Zap, Target, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import soleLogoWithTagline from '@/assets/sole-logo-with-tagline.png';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative group">
                <img 
                  src={soleLogoWithTagline} 
                  alt="SOLE - Born for Us. Raised by the Culture" 
                  className="h-32 w-auto transition-all duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 rounded-lg transition-opacity duration-300" />
              </div>
            </div>
            
            {/* Hero Content */}
            <div className="space-y-6 max-w-4xl mx-auto">
              <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-tight">
                Sole Central Station
              </h1>
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Your AI-powered content orchestration platform. Born for us, raised by the culture.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                <Button 
                  asChild
                  size="lg" 
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-300 text-lg px-8 py-6"
                >
                  <Link to="/auth">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg px-8 py-6"
                  asChild
                >
                  <Link to="/dashboard">
                    View Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Built for Content Excellence
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Harness the power of AI to create, manage, and optimize your content strategy with precision and cultural authenticity.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-gradient-surface shadow-elegant hover:shadow-glow transition-all duration-300 border-0 group">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">AI-Powered Generation</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Create compelling content with advanced AI that understands your brand voice and cultural context.
                </p>
              </div>
            </Card>
            
            <Card className="p-8 bg-gradient-surface shadow-elegant hover:shadow-glow transition-all duration-300 border-0 group">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Smart Orchestration</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Streamline your content workflow with intelligent scheduling and automated optimization.
                </p>
              </div>
            </Card>
            
            <Card className="p-8 bg-gradient-surface shadow-elegant hover:shadow-glow transition-all duration-300 border-0 group">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Cultural Authenticity</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Maintain authentic voice and cultural relevance across all your content channels.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold text-white">
              Ready to Transform Your Content Strategy?
            </h2>
            <p className="text-xl text-primary-foreground/90 leading-relaxed">
              Join the revolution of AI-powered content creation that honors culture and drives results.
            </p>
            <Button 
              asChild
              size="lg" 
              variant="secondary"
              className="bg-white text-primary hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-12 py-6"
            >
              <Link to="/auth">
                Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
