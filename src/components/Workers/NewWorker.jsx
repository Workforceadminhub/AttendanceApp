import React, { useState } from "react";
import Form from "../Form";
import { toast } from "react-toastify";
import { validateEmail } from "../../utils/validate";
import { addNewWorker } from "../../services/workers";

function NewWorker() {
  const newWorker = {
    firstname: "",
    lastname: "",
    othername: "",
    email: "",
    phonenumber: "",
    maritalstatus: "",
    gender: "",
    birthdate: "",
    agerange: "",
    employment: "",
    team: "",
    department: "",
    workerrole: "",
    nameofrequester: "",
  };
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(newWorker);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const nextErrors = {};
    const requiredFields = {
      firstname: "Enter the worker's first name.",
      lastname: "Enter the worker's last name.",
      email: "Enter the worker's email address.",
      phonenumber: "Enter an 11-digit phone number.",
      nameofrequester: "Enter the name of the person making this request.",
      team: "Select a team.",
      department: "Select a department.",
      workerrole: "Select a worker role.",
      gender: "Select a gender.",
      maritalstatus: "Select a marital status.",
      birthdate: "Select a day and month of birth.",
      agerange: "Select an age range.",
      employment: "Select an employment status.",
    };

    Object.entries(requiredFields).forEach(([field, message]) => {
      if (!String(formData[field] || "").trim()) nextErrors[field] = message;
    });
    if (formData.email && !validateEmail(formData.email)) {
      nextErrors.email = "Enter a valid email address, such as name@example.com.";
    }
    if (formData.phonenumber && !/^\d{11}$/.test(formData.phonenumber)) {
      nextErrors.phonenumber = "Phone number must contain exactly 11 digits.";
    }

    setErrors(nextErrors);
    const firstInvalid = Object.keys(nextErrors)[0];
    if (firstInvalid) {
      requestAnimationFrame(() => {
        const input = document.getElementById(firstInvalid);
        const wrap = input?.closest(".t-input-wrap");
        input?.focus();
        wrap?.classList.add("is-error");
        input?.classList.add("is-error");
        input?.classList.remove("is-shaking");
        if (input) void input.offsetWidth;
        input?.classList.add("is-shaking");

        const styles = getComputedStyle(document.documentElement);
        const readMs = (name, fallback) => {
          const value = parseFloat(styles.getPropertyValue(name));
          return Number.isFinite(value) ? value : fallback;
        };
        const shakeMs =
          readMs("--shake-dur-a", 80) * 2 +
          readMs("--shake-dur-b", 60) * 2;
        setTimeout(() => input?.classList.remove("is-shaking"), shakeMs + 20);
      });
    }
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await addNewWorker(formData);
      toast.success("Worker addition request submitted and pending approval");
      setFormData(newWorker);
      setErrors({});
    } catch (error) {
      toast.error(error?.message || "We couldn't submit this request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="border-b border-ink-200 bg-cream">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-3">
          <a href="/" aria-label="Harvesters attendance home">
            <img
              src="/logo.jpg"
              alt="Harvesters"
              className="h-12 w-auto select-none mix-blend-multiply"
            />
          </a>
          <span className="hidden sm:inline-block h-4 w-px bg-ink-200" />
          <span className="hidden sm:inline-block text-sm text-ink-500 font-mono">
            Worker registration
          </span>
        </div>
      </header>

      <main className="flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-3xl mx-auto">
          <div className="max-w-2xl mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink-900">
              Add a new worker
            </h1>
            <p className="mt-3 text-base text-ink-600 leading-relaxed">
              Submit their details for review. Required fields are marked with an asterisk.
            </p>
          </div>
        <Form
          formData={formData}
          handleSubmit={handleSubmit}
          setFormData={setFormData}
          isLoading={isLoading}
          errors={errors}
          setErrors={setErrors}
        />
        </div>
      </main>

      <footer className="border-t border-ink-200 py-5 px-5 sm:px-8 text-center text-xs text-ink-500">
        Harvesters International Christian Centre, Gbagada Campus
      </footer>
    </div>
  );
}

export default NewWorker;
