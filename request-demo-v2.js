console.log("v2");
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
    scriptElement.async = 1;
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
    // Attaching BookIt process to your form submit button
    const attachToForm = () => {
      let registered = false;
      console.log("Attempting to attach to form");
      const myForm = document.querySelector("#email-form");
      if (myForm != null) {
        registered = true;
        // TODO: Verify selector below
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
                "gmail.",
                "yahoo.",
                "hotmail.",
                "outlook.",
                "msn.",
                "icloud.",
              ];

              // validate email field
              // get the email field
              const email = $(".business-only-email-field");
              // split email at '@' character to get domain
              let emailValue = email.val();
              let domainPart = emailValue.split("@")[1] || "";

              // convert the domain to lowercase before comparing, just in case the user typed it in caps
              domainPart = domainPart.toLowerCase();
              // check if the domain starts with any invalid domain
              let isInvalid = invalidDomains.some((invalidDomain) =>
                domainPart.startsWith(invalidDomain)
              );

              // if the domain exists in the invalidDomains array
              if (isInvalid) {
                // add the 'has-error' class to show the error message
                email.addClass("has-error");
                // focus the email field
                email.focus();
                email.on("input", () => {
                  // remove error message when user restarts typing
                  email.removeClass("has-error");
                  $(".no-pea-message").hide();
                });
                $(".no-pea-message").show();

                // prevent form submission
                return false;
              } else {
                // else if email is not invalid
                const loadingScreen = document.querySelector(".loading-screen");
                const emailErrorMsg = document.querySelector(
                  ".email-form-error-message"
                );
                loadingScreen.style.display = "flex";
                loadingScreen.style.opacity = 1;
                emailErrorMsg.style.display = "none";
                email.removeClass("has-error");
                setTimeout(
                  () =>
                    (loadingScreen.querySelector(
                      ".loading-text"
                    ).style.opacity = 0.5),
                  2000
                );

                // remove the 'no-pea-message' class and hide the error message
                $(".no-pea-message").hide();

                let data = null;
                let emailStatus = null;

                try {
                  // make a POST fetch request to validate the email
                  const response = await fetch(
                    "https://app.amplemarket.com/api/v1/amplemarket_inbounds/validate_email",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ email: email.val() }),
                    }
                  );
                  // get the JSON response
                  data = await response.json();
                  emailStatus = data?.status;

                  // if the request returns a 400 status or a "valid"=false response, don't proceed any further
                  if (response.status === 400 || data?.valid === false) {
                    loadingScreen.style.display = "none";
                    // set the error message
                    emailErrorMsg.style.display = "block";
                    email.addClass("has-error");
                    // focus the email field
                    email.focus();
                    email.on("input", () => {
                      // remove error message when user restarts typing
                      email.removeClass("has-error");
                      emailErrorMsg.style.display = "none";
                    });
                    return false;
                  }
                } catch (error) {
                  console.log(error);
                }

                let enrichRes;
                try {
                  const enrichReq = await fetch(
                    `https://app.amplemarket.com/api/v1/amplemarket_inbounds/enrich_person?email=${encodeURIComponent(
                      email.val()
                    )}`
                  );
                  if (!enrichReq.ok) throw new Error("Failed to fetch");
                  enrichRes = await enrichReq.json();
                } catch (error) {
                  console.error("Error fetching enriched data:", error);
                  enrichRes = null;
                }

                let partnerKey = growsumo.data.partner_key;
                let hiddenField = $(".last-name").val();

                enrichedData = {
                  title: enrichRes ? enrichRes.title : null,
                  person_location: enrichRes ? enrichRes.location : null,
                  size:
                    enrichRes && enrichRes.company
                      ? enrichRes.company.size
                      : null,
                  sales_team_size_enriched:
                    enrichRes &&
                    enrichRes.company &&
                    enrichRes.company.department_headcount
                      ? enrichRes.company.department_headcount.sales
                      : null,
                  industry:
                    enrichRes && enrichRes.company
                      ? enrichRes.company.industry
                      : null,
                  company_location:
                    enrichRes && enrichRes.company
                      ? enrichRes.company.location
                      : null,
                  is_b2b:
                    enrichRes && enrichRes.company
                      ? enrichRes.company.is_b2b
                      : null,
                  is_b2c:
                    enrichRes && enrichRes.company
                      ? enrichRes.company.is_b2c
                      : null,
                  partner_key: partnerKey,
                  hidden_field: hiddenField,
                  email_status: emailStatus,
                  // technologies: enrichRes && enrichRes.company ? enrichRes.company.technologies.join(', ') : null,
                };

                // run bookit code
                BookItAPIRouting(myForm);
              }
            } else {
              isSubmitting = false;
            }
          });
      }
      if (!registered) {
        setTimeout(() => {
          attachToForm();
        }, 1000);
      }
    };
    const BookItAPIRouting = (myForm) => {
      let options = {
        MAType: "Custom",
        formHandle: myForm,
        onError: (error) => {
          // TODO: Add Zap flow trigger here
          postFullRequestData();
        },
        afterSubmit: async (formData) => {
          growsumo.data.name = formData["Name"];
          growsumo.data.email = formData["Company-Email"];
          let domainPart = formData["Company-Email"].split("@")[1];
          domainPart = domainPart.toLowerCase();
          growsumo.data.customer_key = domainPart;
          await growsumo.createSignup();

          setTimeout(() => {
            window.location.href = "/thanks-demo";
          }, 150);
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
          // TODO: Add form validation to stop LD from routing invalid data. Sample validation provided below.
          const requiredFields = myForm.querySelectorAll("[required]");
          console.log(requiredFields);
          let isValid = true;
          requiredFields.forEach((field) => {
            if (field.value === "") {
              isValid = false;
            }
          });
          return isValid;
        },
        formDataCollector: (hiddenFieldNames) => {
          let formData, formHiddenFieldNames;
          [formData, formHiddenFieldNames] = CollectFormData(myForm);
          //splits Name field into first and last by first space
          let name = formData.Name.trim();
          if (name.includes(" ")) {
            const [firstName, ...lastName] = name.split(" ");
            formData.firstname = firstName;
            formData.lastname = lastName.join(" ");
          } else {
            formData.firstname = name;
            formData.lastname = "";
          }

          // Merge enrichedData with formData
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
          // TODO: Use this function to set the log id field on your form so it gets passed to your MA.
          const logIdField = myForm.querySelector(
            'input[name="ld_bookit_log_id"]'
          );
          logIdField.value = responseData.formInput.ld_bookit_log_id;
        },
        beforeSubmit: (formData, responseData) => {
          // TODO: Add Zap flow trigger here
          postFullRequestData();
        },
        /* afterSubmit: (formData, responseData) => {
            if (responseData.calendarLink) {
              LDBookIt.redirect(options);
            }
          }, */
        formSubmitter: () => {
          isSubmitting = true;
          console.log("is submitting");
          // TODO: Verify selector below
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
    // get all form data - this errs on getting too many fields
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
          O;
        case "select-one":
          const selectedIndex = elem.selectedIndex;
          apiName = elem.name;
          formData[apiName] = selectedIndex
            ? elem.options[elem.selectedIndex].value
            : "";
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
    // TODO: ensure you are getting all the data you need from the form
    console.log("formData", formData);
    console.log("hiddenFieldNames", hiddenFieldNames);
    return [formData, hiddenFieldNames];
  };
});
