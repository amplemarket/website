console.log("pricing");
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

document.addEventListener("DOMContentLoaded", () => {
  (function (windowRef, documentRef, fileLocation, functionName) {
    (function () {
      let isSubmitting = false;
      // Attaching BookIt process to your form submit button
      const attachToForm = () => {
        let registered = false;
        console.log("Attempting to attach to form");
        const myForm = document.querySelector("#pricing-startup-form");
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
                  "mail.",
                  "aol.",
                  "qq.",
                ];

                // validate email field
                // get the email field
                const email = document.querySelector("#email-startup");
                // split email at '@' character to get domain
                let emailValue = email.value;
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
                  email.classList.add("has-error");
                  // focus the email field
                  email.focus();
                  email.addEventListener("input", () => {
                    // remove error message when user restarts typing
                    email.classList.remove("has-error");
                    document.querySelector(".no-pea-message").style.display = "none";
                  });
                  document.querySelector(".no-pea-message").style.display = "block";

                  // prevent form submission
                  return false;
                } else {
                  // else if email is not invalid
                  const loadingScreen = document.querySelector(".loading-screen");
                  const emailErrorMsg = document.querySelector(".email-form-error-message");
                  loadingScreen.style.display = "flex";
                  loadingScreen.style.opacity = 1;
                  emailErrorMsg.style.display = "none";
                  email.classList.remove("has-error");
                  setTimeout(
                    () => (loadingScreen.querySelector(".loading-text").style.opacity = 0.5),
                    2000
                  );

                  // remove the 'no-pea-message' class and hide the error message
                  document.querySelector(".no-pea-message").style.display = "none";

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
                        body: JSON.stringify({ email: email.value }),
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
                      email.classList.add("has-error");
                      // focus the email field
                      email.focus();
                      email.addEventListener("input", () => {
                        // remove error message when user restarts typing
                        email.classList.remove("has-error");
                        emailErrorMsg.style.display = "none";
                      });
                      return false;
                    }
                  } catch (error) {
                    console.log(error);
                  }
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

      // Call the function to attach to the form
      attachToForm();
    })();
  })(window, document, '', '');
});
