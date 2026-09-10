import { Upload, FileText, Image as ImageIcon, Eye, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface FileDropzoneProps {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  maxFiles?: number;
  imagesOnly?: boolean;
  /** Files previously selected — used to hydrate the dropzone when the
   * user navigates back to a step so uploads aren't lost. */
  initialFiles?: File[];
  /** Maximum size per file in MB (default 10). */
  maxSizeMB?: number;
}

/** Allowed upload types across the app: JPEG, PNG, GIF, PDF. */
export const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/gif,application/pdf';
const DEFAULT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

interface UploadedFile {
  id: string;
  file: File;
  url: string;
  isImage: boolean;
}

const FileDropzone = ({
  onFilesSelected,
  accept,
  multiple = true,
  label,
  maxFiles = 10,
  imagesOnly = true,
  initialFiles,
  maxSizeMB = 10,
}: FileDropzoneProps) => {
  const [files, setFiles] = useState<UploadedFile[]>(() =>
    (initialFiles ?? []).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      url: URL.createObjectURL(file),
      isImage: file.type.startsWith('image/'),
    })),
  );
  const [previewing, setPreviewing] = useState<UploadedFile | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<UploadedFile | null>(null);
  const hydratedKey = useRef<string>(
    (initialFiles ?? []).map((f) => `${f.name}:${f.size}`).join('|'),
  );

  // Re-hydrate when the parent supplies a new set of files (e.g. drafts
  // reset on Cancel in the dashboard). Skip when identical.
  useEffect(() => {
    const key = (initialFiles ?? []).map((f) => `${f.name}:${f.size}`).join('|');
    if (key === hydratedKey.current) return;
    hydratedKey.current = key;
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles(
      (initialFiles ?? []).map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        url: URL.createObjectURL(file),
        isImage: file.type.startsWith('image/'),
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles]);

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const addFiles = useCallback(
    (incoming: File[]) => {
      if (!incoming.length) return;

      let accepted = incoming;

      const tooBig = accepted.filter((f) => f.size > maxSizeMB * 1024 * 1024);
      if (tooBig.length) {
        accepted = accepted.filter((f) => f.size <= maxSizeMB * 1024 * 1024);
        toast.error(
          `${tooBig.length === 1 ? `"${tooBig[0].name}" is` : `${tooBig.length} files are`} larger than ${maxSizeMB} MB and ${tooBig.length === 1 ? 'was' : 'were'} skipped.`,
        );
        if (!accepted.length) return;
      }

      {
        const allowed = imagesOnly ? IMAGE_TYPES : DEFAULT_TYPES;
        // Some browsers report an empty MIME type — fall back to extension.
        const isAllowed = (f: File) =>
          allowed.includes(f.type) ||
          (!f.type && /\.(jpe?g|png|gif|pdf)$/i.test(f.name) &&
            (imagesOnly ? !/\.pdf$/i.test(f.name) : true));
        const rejected = accepted.filter((f) => !isAllowed(f));
        accepted = accepted.filter(isAllowed);
        if (rejected.length) {
          toast.error(
            imagesOnly
              ? 'Only image files (JPG, PNG, GIF) are allowed.'
              : 'Only JPEG, PNG, GIF, or PDF files are allowed.',
          );
        }
        if (!accepted.length) return;
      }

      const remaining = Math.max(0, maxFiles - files.length);
      if (multiple && accepted.length > remaining) {
        toast.error(`You can upload up to ${maxFiles} files. ${remaining} slot(s) left.`);
        accepted = accepted.slice(0, remaining);
        if (!accepted.length) return;
      }

      const mapped: UploadedFile[] = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        url: URL.createObjectURL(file),
        isImage: file.type.startsWith('image/'),
      }));
      const next = multiple ? [...files, ...mapped] : mapped;
      // Revoke any replaced single-file URLs
      if (!multiple) files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles(next);
      onFilesSelected?.(next.map((f) => f.file));
    },
    [files, multiple, onFilesSelected, maxFiles, imagesOnly, maxSizeMB]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(Array.from(e.target.files));
      // reset value so the same file can be re-picked
      e.target.value = '';
    },
    [addFiles]
  );

  const removeFile = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target) URL.revokeObjectURL(target.url);
    const next = files.filter((f) => f.id !== id);
    setFiles(next);
    onFilesSelected?.(next.map((f) => f.file));
  };

  return (
    <div>
      <div
        className="file-dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept ?? (imagesOnly ? IMAGE_TYPES.join(',') : DEFAULT_ACCEPT)}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
          id={`dropzone-${label}`}
        />
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">Drag & Drop</p>
        <p className="text-xs text-muted-foreground mb-1">
          {imagesOnly ? 'Images only — JPG, PNG, GIF' : 'Accepted: JPG, PNG, GIF, PDF'}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {multiple ? `Up to ${maxFiles} files · ` : ''}Max {maxSizeMB} MB per file
        </p>
        <p className="text-xs text-muted-foreground mb-3">— OR —</p>
        <label
          htmlFor={`dropzone-${label}`}
          className="btn-outline text-xs cursor-pointer"
        >
          BROWSE FILES
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Uploaded ({files.length})
          </p>
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-2 border border-border rounded-lg bg-muted/40">
                <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                  {f.isImage ? (
                    <img src={f.url} alt={f.file.name} className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{f.file.name}</p>
                  <p className="text-xs text-muted-foreground">{(f.file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewing(f)}
                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRemoval(f)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
        title="Remove this file?"
        description={
          pendingRemoval
            ? `"${pendingRemoval.file.name}" will be removed from your upload. You can add it again later.`
            : ''
        }
        confirmLabel="Remove file"
        onConfirm={() => {
          if (pendingRemoval) removeFile(pendingRemoval.id);
          setPendingRemoval(null);
        }}
      />

      {/* Preview modal */}
      {previewing && (
        <div
          className="fixed inset-0 z-50 bg-foreground/70 flex items-center justify-center p-4"
          onClick={() => setPreviewing(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                {previewing.isImage ? (
                  <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <p className="text-sm font-medium text-foreground truncate">{previewing.file.name}</p>
              </div>
              <button
                onClick={() => setPreviewing(null)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-muted">
              {previewing.isImage ? (
                <img src={previewing.url} alt={previewing.file.name} className="w-full h-auto" />
              ) : previewing.file.type === 'application/pdf' ? (
                <iframe src={previewing.url} title={previewing.file.name} className="w-full h-[75vh] bg-card" />
              ) : (
                <div className="p-10 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-foreground mb-3">Preview not available for this file type.</p>
                  <a
                    href={previewing.url}
                    download={previewing.file.name}
                    className="btn-outline text-xs inline-flex"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropzone;
