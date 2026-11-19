import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onClose: () => void;
  password: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}

export default function SignupPasswordDrawer(props: Props) {
  return (
    <Drawer open={props.open} onOpenChange={(open) => { if (!open && !props.loading) props.onClose(); }}>
      <DrawerContent className="max-h-[90dvh]">
        <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0 text-center sm:text-center">
            <DrawerTitle>Create Password</DrawerTitle>
            <DrawerDescription>OTP confirmed</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={props.onSubmit} className="space-y-4">
            {props.error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{props.error}</div>}
            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-medium">Create password</label>
              <Input id="signup-password" type="password" placeholder="Create password (8+ characters)" value={props.password}
                onChange={(event) => props.onPasswordChange(event.target.value)} disabled={props.loading} autoComplete="new-password" maxLength={128} />
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-confirmation" className="text-sm font-medium">Confirm password</label>
              <Input id="signup-confirmation" type="password" placeholder="Confirm password" value={props.confirmation}
                onChange={(event) => props.onConfirmationChange(event.target.value)} disabled={props.loading} autoComplete="new-password" maxLength={128} />
            </div>
            <Button type="submit" className="w-full h-12" disabled={props.loading}>{props.loading ? "Saving..." : "Create Password & Sign In"}</Button>
            <Button type="button" variant="ghost" className="w-full" disabled={props.loading} onClick={props.onClose}>Back</Button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}