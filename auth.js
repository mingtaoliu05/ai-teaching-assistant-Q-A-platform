(() => {
  const page = document.body.dataset.page;
  const currentForm = document.querySelector("form");
  const notice = document.querySelector("#formNotice");

  const readStorage = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // The form still works when storage is unavailable.
    }
  };

  const showNotice = (message, type = "success") => {
    if (!notice) return;
    notice.textContent = message;
    notice.classList.toggle("is-error", type === "error");
    notice.hidden = false;
  };

  const getLabel = (field) =>
    field.dataset.label ||
    field.closest(".form-field")?.querySelector("label")?.textContent.trim() ||
    "该字段";

  const getErrorMessage = (field) => {
    const label = getLabel(field);

    if (field.validity.valueMissing) {
      if (field.type === "checkbox") return "请先勾选并同意相关协议";
      return `请填写${label}`;
    }

    if (field.validity.typeMismatch && field.type === "email") {
      return "请输入有效的邮箱地址，例如 name@example.com";
    }

    if (field.validity.patternMismatch) {
      if (field.type === "tel") return "请输入有效的 11 位手机号码";
      if (field.name === "code" || field.name === "verificationCode") {
        return "验证码应为 6 位数字";
      }
      return `${label}格式不正确`;
    }

    if (field.validity.tooShort) {
      return `${label}至少需要 ${field.minLength} 个字符`;
    }

    if (field.validity.tooLong) {
      return `${label}不能超过 ${field.maxLength} 个字符`;
    }

    return "";
  };

  const setFieldState = (field, force = false) => {
    if (!field.willValidate || field.disabled) {
      return true;
    }

    const shouldShow = force || field.dataset.touched === "true";
    const valid = field.checkValidity();
    const shell = field.closest(".input-shell");
    const fieldContainer = field.closest(".form-field");
    const error = fieldContainer?.querySelector(".field-error");

    if (shell) {
      shell.classList.toggle("is-invalid", shouldShow && !valid);
      shell.classList.toggle(
        "is-valid",
        shouldShow && valid && Boolean(field.value) && field.type !== "checkbox"
      );
    }

    if (error) {
      error.textContent = shouldShow && !valid ? getErrorMessage(field) : "";
    }

    field.setAttribute("aria-invalid", String(shouldShow && !valid));
    return valid;
  };

  const bindFieldValidation = (form) => {
    const fields = [...form.elements].filter(
      (field) => field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement ||
        field instanceof HTMLTextAreaElement
    );

    fields.forEach((field) => {
      field.addEventListener("blur", () => {
        field.dataset.touched = "true";
        setFieldState(field);
      });

      const eventName = field instanceof HTMLSelectElement || field.type === "checkbox" || field.type === "radio"
        ? "change"
        : "input";

      field.addEventListener(eventName, () => {
        if (field.dataset.touched === "true" || form.classList.contains("was-validated")) {
          setFieldState(field);
        }
      });
    });
  };

  if (currentForm) {
    bindFieldValidation(currentForm);
  }

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".input-shell")?.querySelector("input");
      if (!input) return;

      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      button.classList.toggle("is-visible", shouldShow);
      button.setAttribute("aria-pressed", String(shouldShow));
      button.setAttribute("aria-label", shouldShow ? "隐藏密码" : "显示密码");
      input.focus({ preventScroll: true });
    });
  });

  document.querySelectorAll("[data-demo-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showNotice(`${link.dataset.demoLink}为演示入口，正式接入后可配置对应页面。`);
    });
  });

  const formatPhone = (value) => value.replace(/\D/g, "").slice(0, 11);

  document.querySelectorAll("[data-send-code]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = button.closest("form");
      const phone = form?.querySelector('input[type="tel"]');

      if (phone) {
        phone.value = formatPhone(phone.value);
        phone.dataset.touched = "true";
        const phoneIsValid = setFieldState(phone, true);
        if (!phoneIsValid) {
          phone.focus();
          return;
        }
      }

      let seconds = 60;
      button.disabled = true;
      button.textContent = `${seconds}s 后重发`;
      showNotice("验证码已发送，演示环境请填写 123456。");

      const timer = window.setInterval(() => {
        seconds -= 1;
        if (seconds <= 0) {
          window.clearInterval(timer);
          button.disabled = false;
          button.textContent = "重新获取";
          return;
        }
        button.textContent = `${seconds}s 后重发`;
      }, 1000);
    });
  });

  if (page === "login") {
    const form = document.querySelector("#loginForm");
    const account = document.querySelector("#loginAccount");
    const remember = document.querySelector("#rememberAccount");
    const submitButton = form?.querySelector(".primary-button");
    const savedAccount = readStorage("aiTutorRememberedAccount");

    if (account && savedAccount) {
      account.value = savedAccount;
      if (remember) remember.checked = true;
    }

    const setLoginMethod = (method) => {
      document.querySelectorAll("[data-login-panel]").forEach((panel) => {
        const isActive = panel.dataset.loginPanel === method;
        panel.hidden = !isActive;

        panel.querySelectorAll("input").forEach((input) => {
          input.disabled = !isActive;
          if (!isActive) input.dataset.touched = "false";
        });
      });
    };

    form?.querySelectorAll('input[name="loginMethod"]').forEach((radio) => {
      radio.addEventListener("change", () => setLoginMethod(radio.value));
      if (radio.checked) setLoginMethod(radio.value);
    });

    const tradeTimer = document.querySelector("#loginCode");
    tradeTimer?.addEventListener("input", () => {
      tradeTimer.value = tradeTimer.value.replace(/\D/g, "").slice(0, 6);
    });

    if (new URLSearchParams(window.location.search).get("registered") === "1") {
      const profile = readStorage("aiTutorProfile");
      if (profile && account) {
        try {
          account.value = JSON.parse(profile).email || "";
          account.dataset.touched = "false";
        } catch {
          // Ignore malformed local demo data.
        }
      }
      showNotice("注册成功，账号已经准备好，请登录继续。");
    }

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      form.classList.add("was-validated");

      const fields = [...form.elements].filter(
        (field) => field.willValidate && !field.disabled
      );
      const invalidFields = fields.filter((field) => !setFieldState(field, true));

      if (invalidFields.length) {
        invalidFields[0].focus();
        showNotice("请检查标记出的内容后再登录。", "error");
        return;
      }

      const method = form.querySelector('input[name="loginMethod"]:checked')?.value;
      const buttonText = submitButton?.querySelector("span");

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add("is-loading");
      }
      if (buttonText) buttonText.textContent = "正在验证";

      window.setTimeout(() => {
        if (remember?.checked && account) {
          writeStorage("aiTutorRememberedAccount", account.value.trim());
        } else {
          try {
            window.localStorage.removeItem("aiTutorRememberedAccount");
          } catch {
            // Ignore storage restrictions.
          }
        }

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.classList.remove("is-loading");
        }
        if (buttonText) buttonText.textContent = "登录平台";

        const loginMethodName = method === "code" ? "验证码" : "密码";
        showNotice(`验证通过，已使用${loginMethodName}登录。演示页面未连接真实业务接口。`);
      }, 850);
    });
  }

  if (page === "register") {
    const form = document.querySelector("#registerForm");
    const roleRadios = [...document.querySelectorAll('input[name="role"]')];
    const roleDescription = document.querySelector("#roleDescription");
    const password = document.querySelector("#registerPassword");
    const confirmPassword = document.querySelector("#confirmPassword");
    const strength = document.querySelector("[data-password-strength]");
    const strengthBars = document.querySelector(".strength-bars");
    const strengthLabel = document.querySelector("#strengthLabel");
    const matchLabel = document.querySelector("#passwordMatch");
    const phone = document.querySelector("#registerPhone");
    const email = document.querySelector("#registerEmail");
    const submitButton = form?.querySelector(".primary-button");

    const setRole = (role) => {
      document.querySelectorAll("[data-role-panel]").forEach((panel) => {
        const isActive = panel.dataset.rolePanel === role;
        panel.hidden = !isActive;

        panel.querySelectorAll("input, select, textarea").forEach((field) => {
          field.disabled = !isActive;
          if (!isActive) field.dataset.touched = "false";
        });
      });

      if (roleDescription) {
        roleDescription.textContent =
          role === "teacher"
            ? "用于连接你的任教课程与管理权限"
            : "用于匹配你的学段和课程内容";
      }
    };

    roleRadios.forEach((radio) => {
      radio.addEventListener("change", () => setRole(radio.value));
      if (radio.checked) setRole(radio.value);
    });

    phone?.addEventListener("input", () => {
      phone.value = formatPhone(phone.value);
    });

    const getPasswordScore = (value) => {
      let score = 0;
      if (value.length >= 8) score += 1;
      if (/[a-z]/i.test(value) && /\d/.test(value)) score += 1;
      if (/[A-Z]/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;
      if (value.length >= 12) score += 1;
      return score;
    };

    const updatePasswordState = () => {
      if (!password) return;
      const value = password.value;
      const score = getPasswordScore(value);
      const labels = ["较弱", "较弱", "一般", "良好", "很强"];

      if (strength) strength.hidden = value.length === 0;
      if (strengthBars) strengthBars.dataset.score = String(score);
      if (strengthLabel) {
        strengthLabel.textContent = labels[score];
        strengthLabel.dataset.level = String(score);
      }

      if (confirmPassword?.value || confirmPassword?.dataset.touched === "true") {
        updatePasswordMatch();
      }
    };

    const updatePasswordMatch = () => {
      if (!password || !confirmPassword || !matchLabel) return;

      if (!confirmPassword.value) {
        matchLabel.textContent = "";
        matchLabel.dataset.state = "";
        return;
      }

      const matches = password.value === confirmPassword.value;
      matchLabel.textContent = matches ? "两次输入的密码一致" : "两次输入的密码不一致";
      matchLabel.dataset.state = matches ? "match" : "mismatch";
    };

    password?.addEventListener("input", updatePasswordState);
    confirmPassword?.addEventListener("input", updatePasswordMatch);
    confirmPassword?.addEventListener("blur", () => {
      confirmPassword.dataset.touched = "true";
      updatePasswordMatch();
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      form.classList.add("was-validated");

      const fields = [...form.elements].filter(
        (field) => field.willValidate && !field.disabled
      );
      const invalidFields = fields.filter((field) => !setFieldState(field, true));

      if (password && confirmPassword && password.value !== confirmPassword.value) {
        confirmPassword.dataset.touched = "true";
        const matchField = confirmPassword.closest(".form-field");
        const error = matchField?.querySelector(".field-error");
        if (error) error.textContent = "两次输入的密码不一致";
        confirmPassword.setAttribute("aria-invalid", "true");
        invalidFields.push(confirmPassword);
      }

      if (invalidFields.length) {
        invalidFields[0].focus();
        showNotice("还有内容未完成，请根据提示检查注册信息。", "error");
        return;
      }

      const buttonText = submitButton?.querySelector("span");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add("is-loading");
      }
      if (buttonText) buttonText.textContent = "正在创建";

      const selectedRole = form.querySelector('input[name="role"]:checked')?.value || "student";
      const name = document.querySelector("#registerName")?.value.trim() || "";

      const profile = {
        name,
        email: email?.value.trim() || "",
        phone: phone?.value.trim() || "",
        role: selectedRole,
        createdAt: new Date().toISOString(),
      };

      window.setTimeout(() => {
        writeStorage("aiTutorProfile", JSON.stringify(profile));
        showNotice(`欢迎你，${name}。账号已创建，正在前往登录页。`);
        window.setTimeout(() => {
          window.location.href = "index.html?registered=1";
        }, 900);
      }, 850);
    });
  }
})();
