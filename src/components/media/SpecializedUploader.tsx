// gn-apex/src/components/media/SpecializedUploader.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Box, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api";

import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MediaStudioHeader } from "./MediaStudioHeader";
import { DocumentStudio } from "./DocumentStudio";
import { LottieStudio } from "./LottieStudio";
import {
  defaultDocEdits,
  defaultLottieEdits,
  optimizeLottie,
  type DocEdits,
  type LottieEdits,
} from "./studioEdits";

export type SpecializedKind = "documents" | "animations";

export interface SpecializedUploaderProps {
  children: React.ReactNode;
  kind: SpecializedKind;
  contentId?: string;
  onSuccess: (url: string, mediaId: string) => void;
  maxSizeMB?: number;
}

// 🛡️ STRICT TYPING: Lottie JSON Specification
export interface LottieJSON {
  v: string;
  layers: unknown[];
  fr: number;
  [key: string]: unknown;
}

// 🛡️ STRICT TYPING: Axios Error Payload
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const ACCEPT_CONFIG = {
  documents: {
    mime: ".pdf,.docx,.xlsx,.xls,.csv,.txt",
    label: "Documents (PDF, DOCX, CSV)",
    icon: FileText,
  },
  animations: {
    mime: ".json,.lottie",
    label: "Lottie Vectors (.json, .lottie)",
    icon: Box,
  },
};

export function SpecializedUploader({
  children,
  kind,
  onSuccess,
  contentId,
  maxSizeMB = 50,
}: SpecializedUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [queuedFile, setQueuedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [lottieData, setLottieData] = useState<LottieJSON | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Studio sessions (held in refs: updated outside of render in onEditsChange)
  const docEditsRef = useRef<DocEdits | null>(null);
  const lottieEditsRef = useRef<LottieEdits | null>(null);

  const config = ACCEPT_CONFIG[kind];

  // 🧹 Cleanup Object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // 🛡️ DEFENSIVE LOTTIE SIGNATURE CHECK
  const validateLottieSignature = async (
    file: File,
  ): Promise<LottieJSON | boolean> => {
    if (file.name.endsWith(".lottie")) return true; // Binary format is trusted here
    try {
      const text = await file.text();
      const json = JSON.parse(text) as LottieJSON;
      // Standard Lottie files must contain version (v), frame rate (fr), and layers
      if (json.v && json.layers && typeof json.fr === "number") {
        return json;
      }
      return false;
    } catch {
      return false;
    }
  };

  const ingestFile = async (file: File) => {
    docEditsRef.current = null;
    lottieEditsRef.current = null;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error("File size limit exceeded", {
        description: `Max size is ${maxSizeMB}MB.`,
      });
      return;
    }

    if (kind === "animations") {
      const validationResult = await validateLottieSignature(file);
      if (!validationResult) {
        toast.error("Invalid Lottie Vector", {
          description:
            "JSON file does not match the Lottie structural signature.",
        });
        return;
      }

      // If it's a JSON Lottie, store the parsed data for the previewer
      if (file.name.endsWith(".json") && typeof validationResult === "object") {
        setLottieData(validationResult as LottieJSON);
      } else {
        // If it's a .lottie, create an Object URL for DotLottieReact
        setFileUrl(URL.createObjectURL(file));
      }
    } else {
      // It's a document, create a generic URL
      setFileUrl(URL.createObjectURL(file));
    }

    setQueuedFile(file);
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      ingestFile(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    docEditsRef.current = null;
    lottieEditsRef.current = null;
    setQueuedFile(null);
    setLottieData(null);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(null);
  };

  // 🚀 Upload Mutation (Direct to Document Bypass Endpoint)
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      let outFile = file;
      let options: Record<string, unknown> = {};

      if (kind === "animations") {
        const le = lottieEditsRef.current ?? defaultLottieEdits();
        // Plain JSON Lottie is optimised here; binary .lottie goes up untouched.
        if (lottieData && file.name.endsWith(".json")) {
          outFile = new File([optimizeLottie(lottieData, le)], file.name, {
            type: "application/json",
          });
        }
        options = {
          lottie: { format: le.fmt, speed: le.speed, loop: le.loop },
        };
      } else {
        const de = docEditsRef.current ?? defaultDocEdits(file.name);
        options = { document: de };
        if (de.displayName) formData.append("displayName", de.displayName);
      }

      formData.append("file", outFile);
      formData.append("options", JSON.stringify(options));
      if (contentId) {
        formData.append("contentId", contentId);
      }

      const res = await apiClient.post("/media/upload/document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 100) / (e.total ?? 1)));
        },
      });

      return res.data as { url: string; mediaId: string };
    },
    onSuccess: (data) => {
      toast.success("Asset ingested successfully 🎉");
      onSuccess(data.url, data.mediaId);
      handleClose();
    },
    onError: (e: ApiError) => {
      toast.error("Ingestion failed", {
        description:
          e.response?.data?.message || "Storage cluster rejected file.",
      });
      setUploadProgress(0);
    },
  });

  const handleUpload = () => {
    if (!queuedFile) return;
    uploadMutation.mutate(queuedFile);
  };

  const isBusy = uploadMutation.isPending;

  return (
    <>
      <span
        onClick={() => !isBusy && fileInputRef.current?.click()}
        className="cursor-pointer"
      >
        {children}
        <input
          type="file"
          accept={config.mime}
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
      </span>

      <Dialog
        open={!!queuedFile}
        onOpenChange={(o) => !o && !isBusy && handleClose()}
      >
        <DialogContent className="flex h-[94dvh] max-h-[94dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden bg-card p-0 shadow-2xl backdrop-blur-xl sm:max-w-6xl rounded-none dark:bg-neutral-900/90">
          <MediaStudioHeader
            icon={
              kind === "animations" ? (
                <Box className="h-4 w-4 text-white" />
              ) : (
                <FileText className="h-4 w-4 text-white" />
              )
            }
            title="Apex Media Engine"
            subtitle={
              kind === "animations"
                ? "Lottie Studio · play, recolor, optimize"
                : "Document Studio · preview, optimize, protect"
            }
            badge={kind}
            onSelectTemplateFile={ingestFile}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {queuedFile && kind === "animations" && (lottieData || fileUrl) && (
              <LottieStudio
                key={queuedFile.name + queuedFile.size}
                file={queuedFile}
                data={lottieData as Record<string, unknown> | null}
                url={fileUrl}
                onEditsChange={(e) => {
                  lottieEditsRef.current = e;
                }}
              />
            )}
            {queuedFile && kind === "documents" && fileUrl && (
              <DocumentStudio
                key={queuedFile.name + queuedFile.size}
                file={queuedFile}
                url={fileUrl}
                onEditsChange={(e) => {
                  docEditsRef.current = e;
                }}
              />
            )}
            <div className="border-t border-muted-foreground/15 bg-muted px-4 py-3">
              {isBusy ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Loader2 size={11} className="animate-spin" />
                      Uploading
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {uploadProgress}%
                    </span>
                  </div>
                  <Progress
                    value={uploadProgress}
                    className="h-1.5 bg-white/10"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Ready to upload · limit {maxSizeMB} MB
                  </span>
                  <Badge
                    variant="outline"
                    className="border-muted-foreground/15 bg-background font-mono text-[9px] uppercase"
                  >
                    {kind}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-muted-foreground/15 px-6 py-3 sm:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isBusy}
              className="rounded-full text-xs font-medium hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isBusy}
              className="gap-1.5 rounded-full text-xs font-bold shadow-lg shadow-primary/20"
            >
              {isBusy ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Ingest Asset
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
