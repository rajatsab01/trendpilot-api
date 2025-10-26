import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import type { Report, User } from "@shared/schema";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const userId = localStorage.getItem("userId");

  // Fetch user to verify admin status
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user", userId],
    enabled: !!userId,
  });

  // Fetch all reports (admin only)
  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports", userId],
    enabled: !!userId && user?.isAdmin === 1,
  });

  // Update report status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const result = await apiRequest("PATCH", `/api/reports/${reportId}/status`, {
        userId,
        status,
      });
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports", userId] });
      toast({
        title: "Status Updated",
        description: "Report status has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Redirect if not admin
  if (user && user.isAdmin !== 1) {
    setLocation("/community");
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-[#38e07b]/20 text-[#38e07b]";
      case "reviewing":
        return "bg-blue-500/20 text-blue-500";
      case "closed":
        return "bg-gray-500/20 text-gray-400";
      default:
        return "bg-yellow-500/20 text-yellow-500";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bug":
        return "bg-red-500/20 text-red-500";
      case "feature_request":
        return "bg-purple-500/20 text-purple-500";
      case "abuse":
        return "bg-orange-500/20 text-orange-500";
      default:
        return "bg-blue-500/20 text-blue-500";
    }
  };

  const pendingReports = reports.filter(r => r.status === "pending");
  const reviewingReports = reports.filter(r => r.status === "reviewing");
  const resolvedReports = reports.filter(r => r.status === "resolved" || r.status === "closed");

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col pb-20">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111714] border-b border-[#2a3c33] px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/community")}
              className="p-2 hover-elevate active-elevate-2 rounded-lg"
              data-testid="button-back-to-community"
            >
              <span className="material-symbols-outlined text-white">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38e07b] text-2xl">admin_panel_settings</span>
              <h1 className="text-white text-xl font-bold">Admin Panel</h1>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-4 grid grid-cols-3 gap-3">
          <div className="bg-[#1a241f] rounded-xl p-4 border border-yellow-500/30">
            <p className="text-[#6a7f72] text-xs mb-1">Pending</p>
            <p className="text-white text-2xl font-bold">{pendingReports.length}</p>
          </div>
          <div className="bg-[#1a241f] rounded-xl p-4 border border-blue-500/30">
            <p className="text-[#6a7f72] text-xs mb-1">Reviewing</p>
            <p className="text-white text-2xl font-bold">{reviewingReports.length}</p>
          </div>
          <div className="bg-[#1a241f] rounded-xl p-4 border border-[#38e07b]/30">
            <p className="text-[#6a7f72] text-xs mb-1">Resolved</p>
            <p className="text-white text-2xl font-bold">{resolvedReports.length}</p>
          </div>
        </div>

        {/* Reports List */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#9eb7a8]">Loading reports...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-[#1a241f] rounded-xl p-8 text-center border border-[#2a3c33]">
              <span className="material-symbols-outlined text-[#6a7f72] text-5xl mb-3 block">task_alt</span>
              <h3 className="text-white font-semibold mb-2">No Reports</h3>
              <p className="text-[#9eb7a8] text-sm">
                All caught up! No user reports at the moment.
              </p>
            </div>
          ) : (
            <>
              {/* Pending Reports */}
              {pendingReports.length > 0 && (
                <div>
                  <h2 className="text-white font-semibold text-lg mb-3">Pending ({pendingReports.length})</h2>
                  <div className="space-y-3">
                    {pendingReports.map((report) => (
                      <div
                        key={report.id}
                        className="bg-[#1a241f] rounded-xl p-4 border border-yellow-500/30"
                        data-testid={`report-${report.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(report.type)}`}>
                                {report.type.replace("_", " ")}
                              </span>
                              <span className="text-[#6a7f72] text-xs">
                                {new Date(report.createdAt!).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="text-white font-semibold mb-2">{report.subject}</h3>
                            <p className="text-[#9eb7a8] text-sm leading-relaxed">{report.message}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-[#2a3c33]">
                          <button
                            onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "reviewing" })}
                            className="flex-1 px-4 py-2 bg-blue-500/20 text-blue-500 font-semibold rounded-lg hover:bg-blue-500/30 transition-colors"
                            data-testid={`button-review-${report.id}`}
                          >
                            Start Review
                          </button>
                          <button
                            onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "resolved" })}
                            className="flex-1 px-4 py-2 bg-[#38e07b]/20 text-[#38e07b] font-semibold rounded-lg hover:bg-[#38e07b]/30 transition-colors"
                            data-testid={`button-resolve-${report.id}`}
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviewing Reports */}
              {reviewingReports.length > 0 && (
                <div>
                  <h2 className="text-white font-semibold text-lg mb-3">Under Review ({reviewingReports.length})</h2>
                  <div className="space-y-3">
                    {reviewingReports.map((report) => (
                      <div
                        key={report.id}
                        className="bg-[#1a241f] rounded-xl p-4 border border-blue-500/30"
                        data-testid={`report-${report.id}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(report.type)}`}>
                                {report.type.replace("_", " ")}
                              </span>
                              <span className="text-[#6a7f72] text-xs">
                                {new Date(report.createdAt!).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="text-white font-semibold mb-2">{report.subject}</h3>
                            <p className="text-[#9eb7a8] text-sm leading-relaxed">{report.message}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-[#2a3c33]">
                          <button
                            onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "resolved" })}
                            className="flex-1 px-4 py-2 bg-[#38e07b]/20 text-[#38e07b] font-semibold rounded-lg hover:bg-[#38e07b]/30 transition-colors"
                            data-testid={`button-resolve-${report.id}`}
                          >
                            Mark Resolved
                          </button>
                          <button
                            onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "closed" })}
                            className="flex-1 px-4 py-2 bg-gray-500/20 text-gray-400 font-semibold rounded-lg hover:bg-gray-500/30 transition-colors"
                            data-testid={`button-close-${report.id}`}
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved Reports */}
              {resolvedReports.length > 0 && (
                <div>
                  <h2 className="text-white font-semibold text-lg mb-3">Resolved ({resolvedReports.length})</h2>
                  <div className="space-y-3">
                    {resolvedReports.slice(0, 10).map((report) => (
                      <div
                        key={report.id}
                        className="bg-[#1a241f] rounded-xl p-4 border border-[#2a3c33] opacity-60"
                        data-testid={`report-${report.id}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(report.type)}`}>
                            {report.type.replace("_", " ")}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                          <span className="text-[#6a7f72] text-xs">
                            {new Date(report.createdAt!).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold mb-1 text-sm">{report.subject}</h3>
                        <p className="text-[#9eb7a8] text-xs line-clamp-2">{report.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
