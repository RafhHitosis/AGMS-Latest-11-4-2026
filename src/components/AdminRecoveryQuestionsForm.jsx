import { useId, useState } from "react";
import { ADMIN_RECOVERY_QUESTIONS } from "../../shared/adminRecoveryQuestions.js";
import DropdownSelect from "./DropdownSelect";

export default function AdminRecoveryQuestionsForm({
  configured,
  onSave,
  wide = false,
  autoFocus = true,
}) {
  const formId = useId();
  const [firstQuestionId, setFirstQuestionId] = useState(ADMIN_RECOVERY_QUESTIONS[0].id);
  const [secondQuestionId, setSecondQuestionId] = useState(ADMIN_RECOVERY_QUESTIONS[1].id);
  const [firstAnswer, setFirstAnswer] = useState("");
  const [secondAnswer, setSecondAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleFirstQuestionChange = (event) => {
    const nextQuestionId = event.target.value;
    setFirstQuestionId(nextQuestionId);
    if (nextQuestionId === secondQuestionId) {
      setSecondQuestionId(
        ADMIN_RECOVERY_QUESTIONS.find((question) => question.id !== nextQuestionId).id,
      );
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await onSave([
        { questionId: firstQuestionId, answer: firstAnswer },
        { questionId: secondQuestionId, answer: secondAnswer },
      ]);
      setFirstAnswer("");
      setSecondAnswer("");
      setNotice("Admin recovery questions saved. Keep both answers private.");
    } catch (saveError) {
      setError(saveError.message || "Could not save admin recovery questions.");
    } finally {
      setSaving(false);
    }
  };

  const firstQuestionSelectId = `${formId}-first-question`;
  const secondQuestionSelectId = `${formId}-second-question`;
  const firstAnswerId = `${formId}-first-answer`;
  const secondAnswerId = `${formId}-second-answer`;

  return (
    <form
      className={`rounded-xl border border-outline-variant/60 p-4 ${
        wide ? "space-y-4" : "space-y-3"
      }`}
      onSubmit={handleSubmit}
    >
      <div>
        <h3 className="text-sm font-semibold">Admin recovery questions</h3>
        <p className="mt-1 text-xs text-on-surface-variant">
          {configured
            ? "Choose two different prompts and enter new answers to replace the current recovery setup."
            : "Set two different prompts and answers so you can recover access if you forget the admin key."}
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Answers are stored as salted scrypt hashes and cannot be viewed later. Avoid answers that others can guess.
        </p>
      </div>

      <div
        className={
          wide ? "grid gap-x-4 gap-y-3 md:grid-cols-2" : "space-y-3"
        }
      >
        <label className="block text-xs font-medium" htmlFor={firstQuestionSelectId}>
          First question
          <DropdownSelect
            wrapperClassName="mt-1"
            id={firstQuestionSelectId}
            autoFocus={autoFocus}
            value={firstQuestionId}
            onChange={handleFirstQuestionChange}
            className="w-full cursor-pointer rounded-lg border border-outline-variant bg-surface py-2 pl-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {ADMIN_RECOVERY_QUESTIONS.map((question) => (
              <option key={question.id} value={question.id}>{question.prompt}</option>
            ))}
          </DropdownSelect>
        </label>

        <label className="block text-xs font-medium" htmlFor={firstAnswerId}>
          First answer
          <input
            id={firstAnswerId}
            type="password"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            minLength={3}
            maxLength={200}
            required
            value={firstAnswer}
            onChange={(event) => setFirstAnswer(event.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-xs font-medium" htmlFor={secondQuestionSelectId}>
          Second question
          <DropdownSelect
            wrapperClassName="mt-1"
            id={secondQuestionSelectId}
            value={secondQuestionId}
            onChange={(event) => setSecondQuestionId(event.target.value)}
            className="w-full cursor-pointer rounded-lg border border-outline-variant bg-surface py-2 pl-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {ADMIN_RECOVERY_QUESTIONS
              .filter((question) => question.id !== firstQuestionId)
              .map((question) => (
                <option key={question.id} value={question.id}>{question.prompt}</option>
              ))}
          </DropdownSelect>
        </label>

        <label className="block text-xs font-medium" htmlFor={secondAnswerId}>
          Second answer
          <input
            id={secondAnswerId}
            type="password"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            minLength={3}
            maxLength={200}
            required
            value={secondAnswer}
            onChange={(event) => setSecondAnswer(event.target.value)}
            className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && <p className="text-sm text-error" role="alert">{error}</p>}
      {notice && <p className="text-sm text-primary" role="status">{notice}</p>}

      <button
        type="submit"
        disabled={saving}
        className={`flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-on-primary disabled:cursor-wait disabled:opacity-60 ${
          wide ? "md:ml-auto md:w-auto md:px-5" : ""
        }`}
      >
        {saving ? "Saving recovery questions…" : configured ? "Save new recovery answers" : "Set recovery questions"}
      </button>
    </form>
  );
}
