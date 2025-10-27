import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useVersionGuard } from "@/hooks/useVersionGuard";

type ReportType = "abuse_user" | "abuse_post" | "bug" | "feedback" | "feature_request";

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  reportedUserId?: string | null;
  reportedAnalysisId?: string | null;
  defaultType?: ReportType;
  title?: string;
};

export default function ReportModal({
  isOpen,
  onClose,
  userId,
  reportedUserId = null,
  reportedAnalysisId = null,
  defaultType = "bug",
  title = "Submit Report",
}: ReportModalProps) {
  const { toast } = useToast();
  const { guardAction } = useVersionGuard();
  const [type, setType] = useState<ReportType>(defaultType);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync internal type state with defaultType when modal opens or defaultType changes
  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // VERSION CHECKPOINT
    const versionOk = await guardAction();
    if (!versionOk) return;

    if (!subject.trim()) {
      toast({
        title: "Subject Required",
        description: "Please enter a subject for your report",
        variant: "destructive",
      });
      return;
    }

    if (message.trim().length < 10) {
      toast({
        title: "Message Too Short",
        description: "Report message must be at least 10 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest("POST", "/api/reports", {
        userId,
        type,
        subject: subject.trim(),
        message: message.trim(),
        reportedUserId,
        reportedAnalysisId,
      });

      // Invalidate reports cache
      queryClient.invalidateQueries({ queryKey: ["/api/reports", userId] });

      toast({
        title: "Report Submitted",
        description: "Thank you for your report. We'll review it soon.",
      });

      // Reset form and close
      setSubject("");
      setMessage("");
      setType(defaultType);
      setIsSubmitting(false);
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubject("");
      setMessage("");
      setType(defaultType);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a241f] rounded-xl max-w-md w-full p-6 border border-[#2a3c33]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-[#9eb7a8] hover:text-white disabled:opacity-50"
            data-testid="button-close-report"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Report Type */}
          <div>
            <label className="text-white text-sm font-semibold mb-2 block">
              Report Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReportType)}
              disabled={isSubmitting}
              className="w-full bg-[#111714] text-white rounded-xl px-4 py-3 border border-[#2a3c33] focus:ring-2 focus:ring-[#38e07b] outline-none disabled:opacity-50"
              data-testid="select-report-type"
            >
              {reportedAnalysisId && (
                <option value="abuse_post">Report Post</option>
              )}
              {reportedUserId && (
                <option value="abuse_user">Report User</option>
              )}
              <option value="bug">Bug Report</option>
              <option value="feedback">Feedback</option>
              <option value="feature_request">Feature Request</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-white text-sm font-semibold mb-2 block">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSubmitting}
              placeholder="Brief summary of your report"
              className="w-full bg-[#111714] text-white rounded-xl px-4 py-3 border border-[#2a3c33] focus:ring-2 focus:ring-[#38e07b] outline-none placeholder:text-[#6a7f72] disabled:opacity-50"
              data-testid="input-report-subject"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-white text-sm font-semibold mb-2 block">
              Details
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
              placeholder="Provide detailed information about your report..."
              rows={5}
              className="w-full bg-[#111714] text-white rounded-xl px-4 py-3 border border-[#2a3c33] focus:ring-2 focus:ring-[#38e07b] outline-none placeholder:text-[#6a7f72] resize-none disabled:opacity-50"
              data-testid="textarea-report-message"
            />
            <p className="text-[#6a7f72] text-xs mt-1">
              Minimum 10 characters ({message.length}/10)
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !subject.trim() || message.trim().length < 10}
            className="w-full bg-[#38e07b] text-[#111714] py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-submit-report"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
