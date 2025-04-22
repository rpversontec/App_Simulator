document.addEventListener("DOMContentLoaded", () => {
  // --- Get DOM Elements ---
  const tipoRegistroSelect = document.getElementById("tipoRegistro");
  const specificFormsContainer = document.getElementById("specific-forms");
  const placeholderInfo = document.getElementById("placeholder-info");
  const allSpecificForms = document.querySelectorAll(".specific-form");

  const estadoTiempoSelect = document.getElementById("estadoTiempo");
  const estacionSelect = document.getElementById("estacion");

  const generateJsonBtn = document.getElementById("generateJsonBtn");
  const sendBtn = document.getElementById("sendBtn");
  const resetBtn = document.getElementById("resetBtn"); // Get reset button
  const backendUrlInput = document.getElementById("backendUrl");
  const jsonPreviewArea = document.getElementById("jsonPreview");
  const responseArea = document.getElementById("responseArea");
  const mainForm = document.querySelector("#form-simulator"); // Get the form container

  // --- Event Listener for TipoRegistro Change ---
  tipoRegistroSelect.addEventListener("change", () => {
    const selectedType = tipoRegistroSelect.value;

    // Hide placeholder
    placeholderInfo.classList.add("hidden");

    // Hide all specific forms
    allSpecificForms.forEach((form) => form.classList.add("hidden"));

    // Show the selected form
    if (selectedType) {
      const formToShow = document.getElementById(`form-${selectedType}`);
      if (formToShow) {
        formToShow.classList.remove("hidden");
      } else {
        placeholderInfo.textContent = `Form definition for "${selectedType}" not found in HTML.`;
        placeholderInfo.classList.remove("hidden");
      }
    } else {
      placeholderInfo.textContent = `Select a "Record Type" above to see the specific form.`;
      placeholderInfo.classList.remove("hidden");
    }
    // Clear preview and response when form type changes
    jsonPreviewArea.textContent = "JSON preview will appear here...";
    responseArea.innerHTML = "Server response will appear here...";
  });

  // --- Event Listener for Reset Button ---
  resetBtn.addEventListener("click", () => {
    // Reset all form fields within the simulator pane
    mainForm.querySelectorAll("input, select, textarea").forEach((input) => {
      if (input.type === "checkbox" || input.type === "radio") {
        input.checked = false;
      } else if (input.tagName === "SELECT") {
        input.selectedIndex = 0; // Reset select to the first option (usually placeholder)
      } else {
        input.value = "";
      }
    });
    // Manually trigger change on tipoRegistro to reset specific forms visibility
    tipoRegistroSelect.dispatchEvent(new Event("change"));
    // Clear preview and response
    jsonPreviewArea.textContent = "JSON preview will appear here...";
    responseArea.innerHTML = "Server response will appear here...";
  });

  // --- Function to Gather Form Data ---
  function gatherFormData() {
    const tipoRegistro = tipoRegistroSelect.value;
    if (!tipoRegistro) {
      alert("Please select a Record Type.");
      return null;
    }

    const formData = {
      // === Initial Common Fields ===
      estadoTiempo: estadoTiempoSelect.value || null,
      estacion: estacionSelect.value || null,
      tipoRegistro: tipoRegistro,

      // === Fields added based on offline discussion ===
      reporteIdLocal: `local-${crypto.randomUUID()}`, // Generate a simple unique ID
      fechaCapturaLocal: new Date().toISOString(), // Timestamp when data is gathered

      // === Specific Fields (will be populated below) ===
    };

    // Get the currently visible specific form
    const currentFormDiv = document.getElementById(`form-${tipoRegistro}`);
    if (!currentFormDiv) {
      console.error(`Could not find form div for ${tipoRegistro}`);
      return null;
    }

    // --- Read values from the specific form ---
    const inputs = currentFormDiv.querySelectorAll("input, select, textarea");

    inputs.forEach((input) => {
      const name = input.name;
      if (!name) return; // Skip elements without a name attribute

      let value;
      if (input.type === "radio") {
        // Find the checked radio button within the group
        const checkedRadio = currentFormDiv.querySelector(
          `input[name="${name}"]:checked`
        );
        value = checkedRadio ? checkedRadio.value : null;
        // Add only once per group
        if (formData.hasOwnProperty(name)) return;
      } else if (input.type === "checkbox") {
        // Handle checkboxes (like listaChequeo) - build an array
        if (!formData[name]) {
          formData[name] = []; // Initialize array if first checkbox of the group
        }
        if (input.checked) {
          formData[name].push(input.value);
        }
        // Important: This structure relies on all checkboxes for a list having the SAME name.
        return; // Let the loop continue for other checkboxes in the group
      } else if (input.type === "number") {
        value = input.value === "" ? null : parseFloat(input.value); // Parse numbers, handle empty
      } else if (input.tagName === "SELECT") {
        value = input.value === "" ? null : input.value;
      } else {
        // Text, textarea, date, url, etc.
        value = input.value === "" ? null : input.value;
        // Special handling for comma-separated evidences (simple simulation)
        if (name === "evidencias" && value) {
          value = value
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s !== ""); // Split into array
        } else if (name === "evidencias" && !value) {
          value = []; // Ensure it's an empty array if empty
        }
      }
      // Add/overwrite value in formData object for non-checkbox fields
      if (input.type !== "checkbox") {
        formData[name] = value;
      }
    });

    // Ensure 'listaChequeo' exists as an array even if no boxes are checked
    if (tipoRegistro === "camaras_trampa" && !formData["listaChequeo"]) {
      formData["listaChequeo"] = [];
    }
    // Ensure 'evidencias' exists as an array for relevant forms if no text was entered
    const formTypesWithEvidence = [
      "fauna_transecto",
      "fauna_punto_conteo",
      "fauna_busqueda_libre",
      "validacion_cobertura",
      "parcela_vegetacion",
      "camaras_trampa",
    ];
    if (
      formTypesWithEvidence.includes(tipoRegistro) &&
      !formData["evidencias"]
    ) {
      formData["evidencias"] = [];
    }

    // --- Data Type Conversion/Cleanup (Example - adjust as needed) ---
    // Ensure boolean fields are actual booleans if 'true'/'false' strings are used
    if (formData.seguimiento === "true") formData.seguimiento = true;
    if (formData.seguimiento === "false") formData.seguimiento = false;
    if (formData.cambio === "true") formData.cambio = true;
    if (formData.cambio === "false") formData.cambio = false;

    // Remove null/empty values if backend prefers omitted fields (optional)
    // for (const key in formData) {
    //     if (formData[key] === null || formData[key] === '') {
    //         delete formData[key];
    //     }
    // }

    return formData;
  }

  // --- Event Listener for Generate JSON Button ---
  generateJsonBtn.addEventListener("click", () => {
    const formData = gatherFormData();
    if (formData) {
      jsonPreviewArea.textContent = JSON.stringify(formData, null, 2); // Pretty print
      responseArea.innerHTML = "JSON preview generated. Ready to send.";
    } else {
      jsonPreviewArea.textContent =
        "Could not gather form data. Please check selections.";
    }
  });

  // --- Initial setup ---
  // Trigger change event on load in case a default value is set
  tipoRegistroSelect.dispatchEvent(new Event("change"));
}); // End DOMContentLoaded
