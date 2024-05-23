const delay = (ms) => new Promise((res) => setTimeout(res, ms));

document.addEventListener("DOMContentLoaded", () => {
  (function (windowRef, documentRef, fileLocation, functionName) {
    windowRef["LeanDataCalendaringObjName"] = functionName;
    windowRef[functionName] = (...args) => {
      windowRef[functionName].variables = args;
    };
    const scriptElement = documentRef.createElement("script");
    const targetScript = document.getElementsByTagName("script")[0];
    const targetHead = document.getElementsByTagName("head")[0];
    scriptElement.async = true;
    scriptElement.src = fileLocation;
    if (targetScript) {
      targetScript.parentNode.insertBefore(scriptElement, targetScript);
    } else if (targetHead) {
      targetHead.append(scriptElement);
    }
  })(
    window,
    document,
    "https://app.leandata.com/js-snippet/ld_calendaring.js",
    "LDBookIt"
  );

  // TODO: replace values below with your SFDC id and BookIt node name
  LDBookIt("00D5I000000Fr4cUAC", "New Inbound Lead", false, {
    apiRoutingOn: true,
    popupModalOn: true,
  });

  let enrichedData = null;

  (function () {
    let isSubmitting = false;

    const attachToForm = () => {
      let registered = false;
      console.log("Attempting to attach to form");
      const myForm = document.querySelector("#email-form");
      if (myForm) {
        registered = true;
        myForm
          .querySelector('input[type="submit"]')
          .addEventListener("click", async (event) => {
            if (!isSubmitting) {
              event.preventDefault();

              const isFormValid = myForm.checkValidity();

              if (!isFormValid) {
                myForm.reportValidity();
                return;
              }

              const invalidDomains = [
                "gmail.com",
                "yahoo.com",
                "hotmail.com",
                "outlook.com",
                "msn.com",
              ];

              const email = $(".business-only-email-field");
              let domainPart = email.val().split("@")[1].toLowerCase();

              if (invalidDomains.includes(domainPart)) {
                email
                  .addClass("has-error")
                  .focus()
                  .on("input", () => {
                    email.removeClass("has-error");
                    $(".no-pea-message").hide();
                  });
                $(".no-pea-message").show();
                return false;
              } else {
                const loadingScreen = document.querySelector(".loading-screen");
                const emailErrorMsg = document.querySelector(
                  ".email-form-error-message"
                );
                loadingScreen.style.display = "flex";
                loadingScreen.style.opacity = 1;
                emailErrorMsg.style.display = "none";
                email.removeClass("has-error");

                setTimeout(() => {
                  loadingScreen.querySelector(
                    ".loading-text"
                  ).style.opacity = 0.5;
                }, 2000);

                $(".no-pea-message").hide();

                try {
                  const [validateResponse, enrichResponse] = await Promise.all([
                    fetch(
                      "https://app.amplemarket.com/api/v1/amplemarket_inbounds/validate_email",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ email: email.val() }),
                      }
                    ),
                    fetch(
                      `https://app.amplemarket.com/api/v1/amplemarket_inbounds/enrich_person?email=${encodeURIComponent(
                        email.val()
                      )}`
                    ),
                  ]);

                  const validateData = await validateResponse.json();
                  if (!validateResponse.ok || validateData?.valid === false) {
                    throw new Error("Email validation failed");
                  }

                  const enrichData = await enrichResponse.json();

                  let partnerKey = growsumo.data.partner_key;

                  enrichedData = {
                    title: enrichData.title || null,
                    person_location: enrichData.location || null,
                    size: enrichData.company?.size || null,
                    sales_team_size_enriched:
                      enrichData.company?.department_headcount?.sales || null,
                    industry: enrichData.company?.industry || null,
                    company_location: enrichData.company?.location || null,
                    is_b2b: enrichData.company?.is_b2b || null,
                    is_b2c: enrichData.company?.is_b2c || null,
                    partner_key: partnerKey,
                    email_status: validateData.status || null,
                  };
                } catch (error) {
                  console.error("Validation or Enrichment Error:", error);
                  if (error.message === "Email validation failed") {
                    loadingScreen.style.display = "none";
                    emailErrorMsg.style.display = "block";
                    email
                      .addClass("has-error")
                      .focus()
                      .on("input", () => {
                        email.removeClass("has-error");
                        emailErrorMsg.style.display = "none";
                      });
                    return false; // Block submission if email validation fails
                  }
                  // Log enrichment errors but do not block submission
                }

                BookItAPIRouting(myForm);
              }
            } else {
              isSubmitting = false;
            }
          });
      }
      if (!registered) {
        setTimeout(attachToForm, 1000); // Necessary if form might load later
      }
    };

    const BookItAPIRouting = (myForm) => {
      let options = {
        MAType: "Custom",
        formHandle: myForm,
        onError: (error) => {
          postFullRequestData();
        },
        afterSubmit: async (formData) => {
          growsumo.data.name = formData["Name"];
          growsumo.data.email = formData["Company-Email"];
          let domainPart = formData["Company-Email"]
            .split("@")[1]
            .toLowerCase();
          growsumo.data.customer_key = domainPart;
          await growsumo.createSignup();
          setTimeout(() => (window.location.href = "/thanks-demo"), 10);
        },
        afterRouting: (formData, responseData) => {
          window.localStorage.setItem(
            `LDCalendaring_custom_calendarLink`,
            responseData.calendarLink
          );
          window.localStorage.setItem(
            `LDCalendaring_custom_formInput`,
            JSON.stringify(responseData.formInput)
          );
          window.localStorage.setItem(
            `LDCalendaring_custom_newTab`,
            responseData.newTab
          );
        },
        customValidation: () => {
          const requiredFields = myForm.querySelectorAll("[required]");
          let isValid = true;
          requiredFields.forEach((field) => {
            if (!field.value) {
              isValid = false;
            }
          });
          return isValid;
        },
        formDataCollector: (hiddenFieldNames) => {
          let [formData, formHiddenFieldNames] = CollectFormData(myForm);
          let name = formData.Name.trim();
          if (name.includes(" ")) {
            const [firstName, ...lastName] = name.split(" ");
            formData.firstname = firstName;
            formData.lastname = lastName.join(" ");
          } else {
            formData.firstname = name;
            formData.lastname = "";
          }
          if (enrichedData) {
            formData = { ...formData, ...enrichedData };
          }
          return formData;
        },
        hiddenFieldSetter: (
          options,
          formData,
          responseData,
          hiddenFieldNames
        ) => {
          const logIdField = myForm.querySelector(
            'input[name="ld_bookit_log_id"]'
          );
          logIdField.value = responseData.formInput.ld_bookit_log_id;
        },
        beforeSubmit: (formData, responseData) => {
          postFullRequestData();
        },
        formSubmitter: () => {
          isSubmitting = true;
          console.log("is submitting");
          myForm.querySelector('input[type="submit"]').click();
        },
      };
      LDBookIt.submit(options);
    };

    attachToForm();
  })();

  const CollectFormData = (myForm) => {
    let formData = {};
    let hiddenFieldNames = new Set();
    const elements = myForm.elements;
    for (let i = 0; i < elements.length; i++) {
      let elem = elements[i];
      let apiName = elem.name;
      switch (elem.type) {
        case "text":
        case "textarea":
        case "number":
        case "email":
          formData[apiName] = elem.value;
          break;
        case "select-one":
          formData[apiName] = elem.options[elem.selectedIndex].value;
          break;
        case "checkbox":
          formData[apiName] = elem.checked;
          break;
        case "radio":
          if (elem.checked && elem.nextElementSibling) {
            formData[apiName] = elem.nextElementSibling.textContent;
          }
          break;
        case "hidden":
          formData[apiName] = elem.value;
          hiddenFieldNames.add(apiName);
          break;
      }
    }
    return [formData, hiddenFieldNames];
  };
});
