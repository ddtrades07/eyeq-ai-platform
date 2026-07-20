'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ImageType } from '@prisma/client';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requestImagingUpload } from '@/server/actions/imaging';
import { formatFullName } from '@/lib/utils';

type PatientOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

export function UploadImagingDialog({
  patients,
  defaultPatientId,
  buttonLabel = 'Upload imaging',
}: {
  patients: PatientOption[];
  defaultPatientId?: string;
  buttonLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [patientId, setPatientId] = React.useState<string>(defaultPatientId ?? '');
  const [imageType, setImageType] = React.useState<string>(ImageType.FUNDUS);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (defaultPatientId) setPatientId(defaultPatientId);
  }, [defaultPatientId]);

  function reset() {
    setFile(null);
    setProgress(null);
    setUploading(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patientId) return toast.error('Pick a patient');
    if (!file) return toast.error('Pick an image file');
    if (file.size > 50 * 1024 * 1024) return toast.error('File exceeds 50 MB');

    setUploading(true);
    try {
      setProgress('Reserving secure upload slot…');
      const reservation = await requestImagingUpload({
        patientId,
        imageType: imageType as ImageType,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSizeBytes: file.size,
      });

      if (!reservation.ok) {
        throw new Error(reservation.error);
      }

      setProgress('Uploading to secure storage…');
      const put = await fetch(reservation.data.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: file,
      });
      if (!put.ok) {
        throw new Error(`Upload failed (HTTP ${put.status})`);
      }

      toast.success('Imaging uploaded. AI image analysis pending provider review.');
      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4" /> {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload imaging</DialogTitle>
          <DialogDescription>
            Fundus, OCT, VF, slit lamp or external photos. Files are stored
            in your private bucket and reviewed by a provider before sign-off.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId} disabled={!!defaultPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatFullName(p.firstName, p.lastName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Image type</Label>
            <Select value={imageType} onValueChange={setImageType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ImageType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imaging-file">File</Label>
            <Input
              id="imaging-file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/tiff,image/bmp,application/dicom"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            ) : null}
          </div>

          {progress ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> {progress}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !patientId || !file}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
