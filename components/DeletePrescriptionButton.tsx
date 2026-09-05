import React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deletePrescription } from '@/services/prescription';
import { useIsAdmin } from '@/hooks/use-is-admin';

interface DeletePrescriptionButtonProps {
  prescriptionId: string;
  onDelete: () => void;
}

const DeletePrescriptionButton: React.FC<DeletePrescriptionButtonProps> = ({ prescriptionId, onDelete }) => {
  const { isAdmin } = useIsAdmin();

  if (!isAdmin) {
    return null;
  }

  const handleDelete = async () => {
    try {
      await deletePrescription(prescriptionId);
      onDelete();
    } catch (error) {
      console.error('Error deleting prescription:', error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Prescription</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this prescription? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeletePrescriptionButton;
