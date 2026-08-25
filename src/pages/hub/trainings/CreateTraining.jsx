import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/Header";
import Layout from "../../../components/Layout";
import { useCanAction } from "../../../contexts/RBACContext";
import { TrainingFormDrawer } from "./TrainingManagementDrawer";

/** Kept for direct links; creation uses the same complete form as the admin dashboard. */
export default function CreateTraining() {
  const navigate = useNavigate();
  const canCreate = useCanAction("create_training");
  const [open, setOpen] = useState(true);

  if (!canCreate) {
    return (
      <>
        <Header />
        <Layout><div className="p-8 text-center text-ink-500">You do not have permission to create trainings.</div></Layout>
      </>
    );
  }

  const close = () => {
    setOpen(false);
    navigate("/hub/trainings");
  };

  return (
    <>
      <Header />
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <h1 className="text-3xl font-medium text-ink-900 tracking-tight">Create Training</h1>
          <p className="mt-2 text-sm text-ink-500">Set up the schedule, audience, meeting details, cohort, pathway, and certificate in one place.</p>
        </div>
        {open && <TrainingFormDrawer mode="create" onClose={close} onSaved={close} />}
      </Layout>
    </>
  );
}
