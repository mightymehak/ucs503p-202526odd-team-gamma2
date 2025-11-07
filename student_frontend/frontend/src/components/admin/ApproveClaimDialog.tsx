import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface ApproveClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName: string;
  claimId: string;
  action: "approve" | "reject";
}

const ApproveClaimDialog = ({
  open,
  onOpenChange,
  onConfirm,
  itemName,
  claimId,
  action,
}: ApproveClaimDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === "approve" ? "Approve Claim" : "Reject Claim"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === "approve"
              ? `Are you sure you want to approve claim ${claimId} for "${itemName}"? The claimant will be notified and can collect the item.`
              : `Are you sure you want to reject claim ${claimId} for "${itemName}"? The claimant will be notified of the rejection.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {action === "approve" ? "Approve" : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ApproveClaimDialog;
