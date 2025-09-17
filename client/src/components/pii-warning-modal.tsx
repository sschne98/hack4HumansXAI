import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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
      <DialogContent className="max-w-md" data-testid="pii-warning-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-orange-800">
            Personal Information Detected
          </DialogTitle>
        </DialogHeader>

        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="space-y-3">
            <div>
              <h4 className="font-semibold text-orange-800 mb-2">
                {title}
              </h4>
              <p className="text-orange-700 text-sm leading-relaxed">
                {message}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onClose}
                className="flex-1 text-orange-700 border-orange-300 hover:bg-orange-100"
                data-testid="button-abort-message"
              >
                Don't Send Message
              </Button>
              <Button
                size="sm"
                onClick={onContinue}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                data-testid="button-continue-send"
              >
                Send Anyway
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  );
}