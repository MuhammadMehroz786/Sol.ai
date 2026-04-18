import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center px-6 max-w-md">
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/20 blur-2xl opacity-50 rounded-full" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
            <AlertCircle className="h-10 w-10 text-white" />
          </div>
        </div>
      </div>
      <h1 className="text-6xl font-black text-foreground mb-2">404</h1>
      <p className="text-lg font-semibold text-foreground mb-2">Page not found</p>
      <p className="text-sm text-muted-foreground mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90">
        <Link to="/">
          <Home className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
