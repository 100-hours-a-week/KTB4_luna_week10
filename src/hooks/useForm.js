import {
  useCallback,
  useRef,
  useState,
} from "react";

function validateField(
  rawValue,
  rules = {},
  allRawValues = {},
) {
  const stringValue = String(rawValue ?? "");

  if (
    rules.required &&
    stringValue.trim() === ""
  ) {
    return rules.required.message ?? null;
  }

  if (
    rules.minLength &&
    stringValue.length < rules.minLength.value
  ) {
    return rules.minLength.message ?? null;
  }

  if (
    rules.maxLength &&
    stringValue.length > rules.maxLength.value
  ) {
    return rules.maxLength.message ?? null;
  }

  if (rules.pattern) {
    const pattern = rules.pattern.value;

    pattern.lastIndex = 0;
    const isMatch = pattern.test(stringValue);
    pattern.lastIndex = 0;

    if (!isMatch) {
      return rules.pattern.message ?? null;
    }
  }

  if (typeof rules.validate === "function") {
    const result = rules.validate(
      rawValue,
      allRawValues,
    );

    if (
      result !== true &&
      typeof result === "string"
    ) {
      return result;
    }
  }

  return null;
}

function isMountedField(form, field) {
  return Boolean(
    form &&
    field &&
    field.isConnected &&
    field.form === form &&
    form.contains(field),
  );
}

function setFieldDomValue(field, value) {
  if ("value" in field) {
    field.value = value ?? "";
  }
}

export function useForm({
  defaultValues = {},
} = {}) {
  const formRef = useRef(null);
  const fieldsRef = useRef({});
  const rulesRef = useRef({});
  const fieldOptionsRef = useRef({});
  const resetValuesRef = useRef({
    ...defaultValues,
  });
  const submitLockRef = useRef(false);
  const refCallbacksRef = useRef({});

  const [errors, setErrors] = useState({});
  const [formError, setFormErrorState] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setError = useCallback((name, message) => {
    setErrors((previousErrors) => {
      if (message == null || message === "") {
        if (!(name in previousErrors)) {
          return previousErrors;
        }

        const nextErrors = {
          ...previousErrors,
        };

        delete nextErrors[name];
        return nextErrors;
      }

      if (previousErrors[name] === message) {
        return previousErrors;
      }

      return {
        ...previousErrors,
        [name]: message,
      };
    });
  }, []);

  const clearErrors = useCallback((target) => {
    setErrors((previousErrors) => {
      if (target === undefined) {
        return Object.keys(previousErrors).length > 0
          ? {}
          : previousErrors;
      }

      const names = Array.isArray(target)
        ? target
        : [target];
      const nextErrors = {
        ...previousErrors,
      };
      let didChange = false;

      names.forEach((name) => {
        if (name in nextErrors) {
          delete nextErrors[name];
          didChange = true;
        }
      });

      return didChange
        ? nextErrors
        : previousErrors;
    });
  }, []);

  const setFormError = useCallback((message) => {
    setFormErrorState(message ?? "");
  }, []);

  const createValuesSnapshot = useCallback(() => {
    const form = formRef.current;

    if (!form) {
      return {
        values: {},
        fieldNames: [],
      };
    }

    const formData = new FormData(form);
    const values = {};
    const fieldNames = [];

    Object.entries(fieldsRef.current).forEach(
      ([name, field]) => {
        if (
          !isMountedField(form, field) ||
          field.matches(":disabled")
        ) {
          return;
        }

        fieldNames.push(name);

        const entries = formData.getAll(name);

        if (entries.length === 1) {
          [values[name]] = entries;
        } else if (entries.length > 1) {
          values[name] = entries;
        }
      },
    );

    return {
      values,
      fieldNames,
    };
  }, []);

  const getValues = useCallback(() => (
    createValuesSnapshot().values
  ), [createValuesSnapshot]);

  const setValue = useCallback((
    name,
    value,
    { shouldValidate = false } = {},
  ) => {
    const form = formRef.current;
    const field = fieldsRef.current[name];
    const fieldOptions = (
      fieldOptionsRef.current[name]
    );

    if (
      !isMountedField(form, field) ||
      fieldOptions?.controlled
    ) {
      return;
    }

    setFieldDomValue(field, value);

    const rawValue = field.value;

    if (rawValue === "" || !shouldValidate) {
      setError(name, null);
      return;
    }

    const { values } = createValuesSnapshot();
    const message = validateField(
      rawValue,
      rulesRef.current[name],
      values,
    );

    setError(name, message);
  }, [createValuesSnapshot, setError]);

  const reset = useCallback((nextValues) => {
    if (nextValues !== undefined) {
      resetValuesRef.current = {
        ...nextValues,
      };
    }

    const form = formRef.current;

    Object.entries(fieldsRef.current).forEach(
      ([name, field]) => {
        if (
          !isMountedField(form, field) ||
          fieldOptionsRef.current[name]?.controlled
        ) {
          return;
        }

        const hasResetValue = (
          Object.prototype.hasOwnProperty.call(
            resetValuesRef.current,
            name,
          )
        );

        setFieldDomValue(
          field,
          hasResetValue
            ? resetValuesRef.current[name]
            : "",
        );
      },
    );

    setErrors({});
    setFormErrorState("");
  }, []);

  const register = useCallback((
    name,
    rules = {},
    fieldOptions = {},
  ) => {
    rulesRef.current[name] = rules;
    fieldOptionsRef.current[name] = {
      controlled: false,
      shouldValidate: false,
      onChange: undefined,
      ...fieldOptions,
    };

    if (!refCallbacksRef.current[name]) {
      refCallbacksRef.current[name] = (field) => {
        if (!field) {
          delete fieldsRef.current[name];
          return;
        }

        fieldsRef.current[name] = field;

        if (
          fieldOptionsRef.current[name]
            ?.controlled
        ) {
          return;
        }

        const hasResetValue = (
          Object.prototype.hasOwnProperty.call(
            resetValuesRef.current,
            name,
          )
        );

        setFieldDomValue(
          field,
          hasResetValue
            ? resetValuesRef.current[name]
            : "",
        );
      };
    }

    function handleChange(event) {
      const rawValue = event.target.value;
      const currentOptions = (
        fieldOptionsRef.current[name]
      );

      if (rawValue === "") {
        setError(name, null);
      } else if (currentOptions.shouldValidate) {
        const { values } = createValuesSnapshot();
        const message = validateField(
          rawValue,
          rulesRef.current[name],
          values,
        );

        setError(name, message);
      } else {
        setError(name, null);
      }

      if (
        typeof currentOptions.onChange === "function"
      ) {
        currentOptions.onChange(event);
      }
    }

    return {
      name,
      ref: refCallbacksRef.current[name],
      onChange: handleChange,
    };
  }, [createValuesSnapshot, setError]);

  const handleSubmit = useCallback((
    onValid,
    onInvalid,
  ) => async (event) => {
    event?.preventDefault();

    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    let didStartValidSubmit = false;

    try {
      setFormErrorState("");

      const {
        values,
        fieldNames,
      } = createValuesSnapshot();
      const nextErrors = {};

      fieldNames.forEach((name) => {
        const message = validateField(
          values[name],
          rulesRef.current[name],
          values,
        );

        if (message) {
          nextErrors[name] = message;
        }
      });

      setErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        if (typeof onInvalid === "function") {
          await onInvalid(nextErrors, {
            values,
          });
        }

        return;
      }

      if (typeof onValid === "function") {
        didStartValidSubmit = true;
        setIsSubmitting(true);

        await onValid(values, {
          reset,
          setValue,
          getValues,
        });
      }
    } finally {
      if (didStartValidSubmit) {
        setIsSubmitting(false);
      }

      submitLockRef.current = false;
    }
  }, [
    createValuesSnapshot,
    getValues,
    reset,
    setValue,
  ]);

  return {
    formRef,
    register,
    handleSubmit,
    errors,
    formError,
    isSubmitting,
    setError,
    clearErrors,
    setFormError,
    setValue,
    getValues,
    reset,
  };
}
