import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { useCanAction } from "../../../contexts/RBACContext";
import ProgressionPaths from "./ProgressionPaths";

export default function ProgressionPathwaysPage() {
  const canCreate = useCanAction("create_training");

  return (
    <>
      <Header />
      <Layout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-medium text-ink-900 tracking-tight">Progression Pathways</h1>
            <p className="mt-1 text-sm text-ink-500">
              Define and maintain the ordered pathways used by progressive trainings.
            </p>
          </div>
          {canCreate ? <ProgressionPaths /> : <div className="qc-card p-8 text-center text-ink-500">You do not have permission to manage pathways.</div>}
        </div>
      </Layout>
    </>
  );
}
