import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { Tag } from "../../../components/ui";
import {
  fetchMyNominations,
  acceptNomination,
  declineNomination,
} from "../../../services/hub/trainings";

export default function MyNominations() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["hub-my-nominations"],
    queryFn: fetchMyNominations,
  });
  const nominations = data?.data ?? [];

  const acceptMut = useMutation({
    mutationFn: (id) => acceptNomination(id),
    onSuccess: () => {
      toast.success("Nomination accepted - you are now enrolled");
      queryClient.invalidateQueries({ queryKey: ["hub-my-nominations"] });
    },
    onError: (err) => toast.error(err.message || "Failed to accept"),
  });

  const declineMut = useMutation({
    mutationFn: (id) => declineNomination(id),
    onSuccess: () => {
      toast.success("Nomination declined");
      queryClient.invalidateQueries({ queryKey: ["hub-my-nominations"] });
    },
    onError: (err) => toast.error(err.message || "Failed to decline"),
  });

  const pending = nominations.filter((n) => n.status === "pending");
  const resolved = nominations.filter((n) => n.status !== "pending");

  return (
    <>
      <Header />
      <Layout>
        <div className="max-w-2xl space-y-6">
          <div>
            <div className="qc-eyebrow">Training Management</div>
            <h1 className="mt-1 text-3xl font-medium text-ink-900 tracking-tight">
              My Nominations
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Trainings you have been nominated for by your leader.
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-ink-500">Loading...</div>
          ) : nominations.length === 0 ? (
            <div className="qc-card p-8 text-center text-sm text-ink-500">
              You have no nominations at this time.
            </div>
          ) : (
            <>
              {/* Pending nominations */}
              {pending.length > 0 && (
                <div className="space-y-3">
                  <h2 className="qc-section-title">Pending</h2>
                  {pending.map((n) => (
                    <NominationCard
                      key={n.id}
                      nomination={n}
                      onAccept={() => acceptMut.mutate(n.id)}
                      onDecline={() => declineMut.mutate(n.id)}
                      loading={acceptMut.isPending || declineMut.isPending}
                    />
                  ))}
                </div>
              )}

              {/* Resolved nominations */}
              {resolved.length > 0 && (
                <div className="space-y-3">
                  <h2 className="qc-section-title">Past Nominations</h2>
                  {resolved.map((n) => (
                    <NominationCard key={n.id} nomination={n} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </>
  );
}

function NominationCard({ nomination, onAccept, onDecline, loading }) {
  const n = nomination;
  const isPending = n.status === "pending";
  const statusTone =
    n.status === "accepted" ? "success" :
    n.status === "declined" ? "danger" :
    n.status === "expired" ? "warning" :
    "neutral";

  return (
    <div className="qc-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-ink-900">
            {n.training_name ?? `Training ${n.training_id}`}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <Tag tone={statusTone}>{n.status}</Tag>
            {n.expires_at && (
              <span className="text-xs text-ink-500 qc-num">
                Expires {new Date(n.expires_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {isPending && onAccept && onDecline && (
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={onDecline}
              disabled={loading}
              className="qc-btn-secondary text-sm"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={loading}
              className="qc-btn-primary text-sm"
            >
              Accept
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
