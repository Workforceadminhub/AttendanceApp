import { useMemo } from "react";

export const CheckCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
  </svg>
);

export const XCircle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
  </svg>
);

export function usePasswordRequirements(password) {
  return useMemo(() => {
    const checks = {
      length: (password || "").length >= 12,
      uppercase: /[A-Z]/.test(password || ""),
      number: /[0-9]/.test(password || ""),
      special: /[^A-Za-z0-9]/.test(password || ""),
    };
    const allPassed = checks.length && checks.uppercase && checks.number && checks.special;
    return { checks, allPassed };
  }, [password]);
}

export function PasswordRequirementsList({ password }) {
  const { checks } = usePasswordRequirements(password);

  if (!password || password.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1.5">
      {[
        { key: "length", label: "At least 12 characters" },
        { key: "uppercase", label: "At least 1 uppercase letter" },
        { key: "number", label: "At least 1 number" },
        { key: "special", label: "At least 1 special character" },
      ].map(({ key, label }) => (
        <li
          key={key}
          className={`flex items-center gap-2 text-xs font-medium transition-colors ${
            checks[key] ? "text-green-600" : "text-ink-400"
          }`}
        >
          {checks[key] ? <CheckCircle /> : <XCircle />}
          {label}
        </li>
      ))}
    </ul>
  );
}

export function PasswordMatchIndicator({ password, confirmPassword }) {
  if (!confirmPassword || confirmPassword.length === 0) return null;

  const passwordsMatch = (password || "").length > 0 && password === confirmPassword;

  return (
    <p
      className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
        passwordsMatch ? "text-green-600" : "text-red-500"
      }`}
    >
      {passwordsMatch ? <CheckCircle /> : <XCircle />}
      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
    </p>
  );
}
