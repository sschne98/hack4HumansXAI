import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart } from 'lucide-react';
import customShield from "@assets/generated-image (12)_1758122670225.png";

interface PIIWarningModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  title: string;
  message: string;
}

export default function PIIWarningModal({ 
  open, 
  onClose, 
  onContinue, 
  title, 
  message 
}: PIIWarningModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl shadow-xl" data-testid="pii-warning-modal">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-16 h-16 rounded-full flex items-center justify-center">
            <img 
              src={customShield} 
              alt="DigiGuard Shield" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>
        </DialogHeader>

        <Alert className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl">
          <AlertDescription className="space-y-4">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2 text-center">
                {title}
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed text-center">
                {message}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onClose}
                className="flex-1 text-blue-700 border-blue-300 hover:bg-blue-50 rounded-xl font-medium transition-all duration-200 hover:scale-105"
                data-testid="button-abort-message"
              >
                ✨ Let me rephrase
              </Button>
              <Button
                size="sm"
                onClick={onContinue}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105"
                data-testid="button-continue-send"
              >
                🚀 Send it anyway
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}