import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { login, register, isLoading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    department: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isLoginMode) {
        await login(formData.email, formData.password);
      } else {
        // Auto-generate username from email
        const username = formData.email.split('@')[0];
        await register({
          ...formData,
          username,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center telekom-gradient p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="text-white text-2xl" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Telekom Messenger</h1>
            <p className="text-muted-foreground mt-2">Connect with your team</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="auth-form">
            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your.email@telekom.com"
                value={formData.email}
                onChange={handleInputChange}
                required
                data-testid="input-email"
              />
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
                data-testid="input-password"
              />
            </div>

            {!isLoginMode && (
              <>
                <div>
                  <Label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-2">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required
                    data-testid="input-displayName"
                  />
                </div>

                <div>
                  <Label htmlFor="department" className="block text-sm font-medium text-foreground mb-2">
                    Department
                  </Label>
                  <Input
                    id="department"
                    name="department"
                    type="text"
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={handleInputChange}
                    data-testid="input-department"
                  />
                </div>
              </>
            )}

            <Button 
              type="submit" 
              className="w-full telekom-gradient text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoginMode ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="text-center mt-6">
            <button 
              type="button"
              onClick={() => setIsLoginMode(!isLoginMode)}
              className="text-primary hover:underline text-sm"
              data-testid="link-toggle-mode"
            >
              {isLoginMode 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
