"use client";

import { useState, type SubmitEventHandler } from "react";

import type {
  AdminProductCreateInput,
  AdminProductStatus,
  AdminProductUpdateInput,
} from "../../../features/products/api";
import styles from "./AdminProductForm.module.css";

export type AdminProductFieldErrors = Partial<
  Record<
    | "name"
    | "description"
    | "price"
    | "taxRateId"
    | "categoryId"
    | "stockQuantity"
    | "lowStockThreshold"
    | "status",
    string[]
  >
>;

export type AdminProductFormValues = {
  name: string;
  description: string;
  price: string;
  taxRateId: string;
  categoryId: string;
  stockQuantity: string;
  lowStockThreshold: string;
  status: AdminProductStatus;
};

type AdminProductFormProps = {
  mode: "create" | "edit";
  initialValues: AdminProductFormValues;
  isSubmitting: boolean;
  feedback?: {
    kind: "error" | "success";
    message: string;
  } | null;
  fieldErrors?: AdminProductFieldErrors;
  onSubmit: (
    input: AdminProductCreateInput | AdminProductUpdateInput,
  ) => Promise<void>;
};

const statusOptions: Array<{ value: AdminProductStatus; label: string }> = [
  { value: "active", label: "販売中" },
  { value: "stopped", label: "販売停止" },
];

const integerFields = [
  "price",
  "taxRateId",
  "categoryId",
  "stockQuantity",
  "lowStockThreshold",
] as const;

const toInteger = (value: string) => Number(value);

const getFieldErrorMessage = (
  fieldErrors: AdminProductFieldErrors | undefined,
  field: keyof AdminProductFieldErrors,
) => {
  const messages = fieldErrors?.[field];

  return messages && messages.length > 0 ? messages.join("\n") : null;
};

const validateValues = (values: AdminProductFormValues, mode: "create" | "edit") => {
  const errors: AdminProductFieldErrors = {};

  if (!values.name.trim()) {
    errors.name = ["商品名を入力してください。"];
  }

  for (const field of integerFields) {
    const value = toInteger(values[field]);

    if (!Number.isInteger(value)) {
      errors[field] = ["整数で入力してください。"];
    }
  }

  if (Number.isInteger(toInteger(values.price)) && toInteger(values.price) <= 0) {
    errors.price = ["価格は1以上で入力してください。"];
  }

  for (const field of ["taxRateId", "categoryId"] as const) {
    const value = toInteger(values[field]);

    if (Number.isInteger(value) && value < 1) {
      errors[field] = ["1以上で入力してください。"];
    }
  }

  for (const field of ["stockQuantity", "lowStockThreshold"] as const) {
    const value = toInteger(values[field]);

    if (Number.isInteger(value) && value < 0) {
      errors[field] = ["0以上で入力してください。"];
    }
  }

  if (mode === "create" && !["active", "stopped"].includes(values.status)) {
    errors.status = ["販売状態を選択してください。"];
  }

  return errors;
};

const hasFieldErrors = (fieldErrors: AdminProductFieldErrors) => {
  return Object.values(fieldErrors).some((messages) => messages.length > 0);
};

const buildInput = (
  values: AdminProductFormValues,
  mode: "create" | "edit",
): AdminProductCreateInput | AdminProductUpdateInput => {
  const description = values.description.trim() || null;
  const input = {
    name: values.name.trim(),
    description,
    price: toInteger(values.price),
    taxRateId: toInteger(values.taxRateId),
    categoryId: toInteger(values.categoryId),
    stockQuantity: toInteger(values.stockQuantity),
    lowStockThreshold: toInteger(values.lowStockThreshold),
  };

  if (mode === "create") {
    return {
      ...input,
      status: values.status,
    };
  }

  return input;
};

export const adminProductToFormValues = (
  values: Partial<AdminProductFormValues> = {},
): AdminProductFormValues => ({
  name: "",
  description: "",
  price: "",
  taxRateId: "",
  categoryId: "",
  stockQuantity: "",
  lowStockThreshold: "",
  status: "active",
  ...values,
});

export default function AdminProductForm({
  mode,
  initialValues,
  isSubmitting,
  feedback,
  fieldErrors,
  onSubmit,
}: AdminProductFormProps) {
  const [values, setValues] = useState(initialValues);
  const [clientFieldErrors, setClientFieldErrors] =
    useState<AdminProductFieldErrors>({});

  const mergedFieldErrors: AdminProductFieldErrors = {
    ...fieldErrors,
    ...clientFieldErrors,
  };

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const validationErrors = validateValues(values, mode);
    setClientFieldErrors(validationErrors);

    if (hasFieldErrors(validationErrors)) {
      return;
    }

    await onSubmit(buildInput(values, mode));
  };

  const updateValue = (
    field: keyof AdminProductFormValues,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setClientFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  return (
    <form
      className={styles.form}
      aria-label={mode === "create" ? "商品登録" : "商品編集"}
      noValidate
      onSubmit={handleSubmit}
    >
      <label className={styles.field}>
        <span className={styles.label}>商品名</span>
        <input
          className={styles.input}
          type="text"
          name="name"
          value={values.name}
          disabled={isSubmitting}
          required
          onChange={(event) => updateValue("name", event.target.value)}
        />
        <FieldError message={getFieldErrorMessage(mergedFieldErrors, "name")} />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>説明</span>
        <textarea
          className={styles.textarea}
          name="description"
          value={values.description}
          disabled={isSubmitting}
          rows={6}
          onChange={(event) => updateValue("description", event.target.value)}
        />
        <FieldError
          message={getFieldErrorMessage(mergedFieldErrors, "description")}
        />
      </label>

      <div className={styles.fieldGrid}>
        <NumberField
          label="価格"
          name="price"
          value={values.price}
          min={1}
          disabled={isSubmitting}
          errorMessage={getFieldErrorMessage(mergedFieldErrors, "price")}
          onChange={(value) => updateValue("price", value)}
        />
        <NumberField
          label="Tax Rate ID"
          name="taxRateId"
          value={values.taxRateId}
          min={1}
          disabled={isSubmitting}
          errorMessage={getFieldErrorMessage(mergedFieldErrors, "taxRateId")}
          onChange={(value) => updateValue("taxRateId", value)}
        />
        <NumberField
          label="Category ID"
          name="categoryId"
          value={values.categoryId}
          min={1}
          disabled={isSubmitting}
          errorMessage={getFieldErrorMessage(mergedFieldErrors, "categoryId")}
          onChange={(value) => updateValue("categoryId", value)}
        />
        <NumberField
          label="在庫数"
          name="stockQuantity"
          value={values.stockQuantity}
          min={0}
          disabled={isSubmitting}
          errorMessage={getFieldErrorMessage(
            mergedFieldErrors,
            "stockQuantity",
          )}
          onChange={(value) => updateValue("stockQuantity", value)}
        />
        <NumberField
          label="低在庫しきい値"
          name="lowStockThreshold"
          value={values.lowStockThreshold}
          min={0}
          disabled={isSubmitting}
          errorMessage={getFieldErrorMessage(
            mergedFieldErrors,
            "lowStockThreshold",
          )}
          onChange={(value) => updateValue("lowStockThreshold", value)}
        />
      </div>

      {mode === "create" ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.label}>販売状態</legend>
          <div className={styles.radioGroup}>
            {statusOptions.map((option) => (
              <label className={styles.radioLabel} key={option.value}>
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  checked={values.status === option.value}
                  disabled={isSubmitting}
                  onChange={() => updateValue("status", option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <FieldError
            message={getFieldErrorMessage(mergedFieldErrors, "status")}
          />
        </fieldset>
      ) : null}

      <div className={styles.actionRow}>
        <button
          className={styles.primaryButton}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? mode === "create"
              ? "登録中..."
              : "保存中..."
            : mode === "create"
              ? "登録する"
              : "保存する"}
        </button>
      </div>

      {feedback ? (
        <p
          className={
            feedback.kind === "success" ? styles.success : styles.formError
          }
          role={feedback.kind === "success" ? "status" : "alert"}
        >
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}

type NumberFieldProps = {
  label: string;
  name:
    | "price"
    | "taxRateId"
    | "categoryId"
    | "stockQuantity"
    | "lowStockThreshold";
  value: string;
  min: number;
  disabled: boolean;
  errorMessage: string | null;
  onChange: (value: string) => void;
};

function NumberField({
  label,
  name,
  value,
  min,
  disabled,
  errorMessage,
  onChange,
}: NumberFieldProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <input
        className={styles.input}
        type="number"
        name={name}
        value={value}
        min={min}
        step={1}
        disabled={disabled}
        required
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError message={errorMessage} />
    </label>
  );
}

function FieldError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <span className={styles.fieldError} role="alert">
      {message}
    </span>
  );
}
