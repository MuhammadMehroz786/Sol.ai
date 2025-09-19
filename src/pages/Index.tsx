import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Zap, Target, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import soleLogoWithTagline from '@/assets/sole-logo-with-tagline.png';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Compact Hero Section */}
      <header className="relative">
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <div className="text-center space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <img 
                src={soleLogoWithTagline} 
                alt="SOLE - Born for Us. Raised by the Culture" 
                className="h-24 w-auto hover:scale-105 transition-transform duration-300"
              />
            </div>
            
            {/* Hero Content */}
            <div className="space-y-4 max-w-3xl mx-auto">
              <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Sole Central Station
              </h1>
              <p className="text-xl lg:text-2xl text-muted-foreground max-w-xl mx-auto">
                AI-powered content orchestration platform. Born for us, raised by the culture.
              </p>
              
              <div className="flex justify-center items-center pt-4">
                <Button 
                  asChild
                  size="lg" 
                  className="bg-gradient-primary hover:shadow-glow transition-all duration-300 px-6"
                >
                  <Link to="/auth">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Compact Features Section */}
      <section className="py-12 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-foreground mb-3">
              Built for Content Excellence
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Harness AI to create, manage, and optimize your content with cultural authenticity.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 bg-gradient-surface shadow-elegant hover:shadow-glow transition-all duration-300 border-0 group">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">AI Generation</h3>
                <p className="text-base text-muted-foreground">
                  Create compelling content with AI that understands your brand voice.
                </p>
              </div>
            </Card>
            
            <Card className="p-6 bg-gradient-surface shadow-elegant hover:shadow-glow transition-all duration-300 border-0 group">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Smart Workflow</h3>
                <p className="text-base text-muted-foreground">
                  Streamline content with intelligent scheduling and optimization.
                </p>
              </div>
            </Card>
            
            <Card className="p-6 bg-gradient-surface shadow-elegant hover:shadow-glow transition-all duration-300 border-0 group">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Cultural Voice</h3>
                <p className="text-base text-muted-foreground">
                  Maintain authentic voice and cultural relevance across channels.
                </p>
              </div>
            </Card>
          </div>

          {/* Compact CTA */}
          <div className="text-center mt-12 py-8 px-6 bg-gradient-primary rounded-2xl max-w-2xl mx-auto">
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to Transform Your Content?
            </h3>
            <p className="text-lg text-primary-foreground/90 mb-6">
              Join the AI-powered content revolution that honors culture.
            </p>
            <Button 
              asChild
              size="lg" 
              variant="secondary"
              className="bg-white text-primary hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link to="/auth">
                Learn More <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
