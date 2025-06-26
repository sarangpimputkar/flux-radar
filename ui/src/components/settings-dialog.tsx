"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  setAppName: (name: string) => void;
};

export function SettingsDialog({ open, onOpenChange, appName, setAppName }: SettingsDialogProps) {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your branding settings have been updated.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Custom Branding</DialogTitle>
          <DialogDescription>
            Customize the dashboard to match your organization's branding.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="appName" className="text-right">
              App Name
            </Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="logo" className="text-right">
              Logo
            </Label>
            <div className="col-span-3">
              <Button variant="outline" onClick={() => alert('Logo upload is a demo feature.')}>
                Upload Logo
              </Button>
            </div>
            <div className="col-start-2 col-span-3 text-sm text-muted-foreground">
              Current: Default Logo
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
