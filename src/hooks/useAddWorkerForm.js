import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { normalizeWorkerRole } from "../utils/teams";
import { focusFirstWorkerError, validateAuthenticatedWorker } from "../utils/workerFormValidation";

export const EMPTY_WORKER = {
  firstname: "",
  lastname: "",
  othername: "",
  email: "",
  phonenumber: "",
  maritalstatus: "",
  department: "",
  team: "",
  workerrole: "",
  birthdate: "",
  agerange: "",
  gender: "",
  address: "",
  occupation: "",
  employment: "",
  district_sub_team: "",
};

/** Body for POST /api/super/admin/workers: canonical role, cluster mirrored or omitted. */
export function toWorkerPayload(worker) {
  const payload = { ...worker, workerrole: normalizeWorkerRole(worker.workerrole) };
  if (typeof payload.email === "string") payload.email = payload.email.trim();
  const cluster = (payload.cluster || payload.district_sub_team || "").trim();
  if (cluster) {
    payload.cluster = cluster;
    payload.district_sub_team = cluster;
  } else {
    delete payload.cluster;
    delete payload.district_sub_team;
  }
  return payload;
}

const submitErrorMessage = (error) =>
  /worker\s+already\s+exist/i.test(error?.message || "")
    ? "Worker already belongs to another department"
    : error?.message || "Failed to add worker";

/**
 * State and submit flow for a single add-worker form.
 * `send(worker)` performs the request and owns the success toast or navigation.
 */
export function useAddWorkerForm({ send, validationOptions }) {
  const [worker, setWorker] = useState(EMPTY_WORKER);
  const [formErrors, setFormErrors] = useState({});
  // The submit error belongs to the values it was raised for, so editing hides it.
  const [submitFailure, setSubmitFailure] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitError = submitFailure?.worker === worker ? submitFailure.message : "";

  // Only show errors still present for the current form values.
  const visibleErrors = useMemo(() => {
    if (Object.keys(formErrors).length === 0) return formErrors;
    const latest = validateAuthenticatedWorker(worker, validationOptions);
    return Object.fromEntries(Object.entries(formErrors).filter(([field]) => latest[field]));
  }, [formErrors, worker, validationOptions]);

  const handleSubmit = async (event) => {
    event?.preventDefault();
    const nextErrors = validateAuthenticatedWorker(worker, validationOptions);
    setFormErrors(nextErrors);
    setSubmitFailure(null);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstWorkerError(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await send(worker);
      setFormErrors({});
      setWorker(EMPTY_WORKER);
    } catch (error) {
      const message = submitErrorMessage(error);
      setSubmitFailure({ message, worker });
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { worker, setWorker, visibleErrors, submitError, isSubmitting, handleSubmit };
}
