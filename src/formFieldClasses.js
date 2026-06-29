import { uiForm, uiFormField } from './ui/uiFormatClasses.js';

export const formFieldPairGrid = uiFormField.pairGrid;
export const formFieldPairLabel = uiFormField.pairLabel;
export const formFieldPairLabelRow = uiFormField.pairLabelRow;
export const formFieldPairLabelHint = uiFormField.pairLabelHint;
export const formFieldPairControl = uiFormField.pairControl;

export const formPaymentSectionBody = uiFormField.paymentSectionBody;
export const formPaymentPairGrid = uiFormField.paymentPairGrid;
export const formPaymentPairLabel = uiFormField.paymentPairLabel;
export const formPaymentPairLabelRow = uiFormField.paymentPairLabelRow;
export const formPaymentHints = uiFormField.paymentHints;

/** Contenedor label + control (alineación vertical consistente). */
export const formFieldStack = uiFormField.stack;

/** Panel admin: inputs, selects, textareas. */
export const formPanelInputClasses = uiFormField.control;

/** Panel admin: etiqueta sobre el control. */
export const formPanelLabelClasses = uiFormField.label;

/** Registro público / móvil: mismos tamaños, táctil. */
export const formPublicInputClasses = `${uiFormField.controlPublic} touch-manipulation`;

export const formPublicLabelClasses = uiFormField.label;

/** Fases de precios y tablas compactas (ya eran bajas). */
export const formPhaseInputClasses = uiForm.inputCompact;
export const formPhaseLabelClasses = uiFormField.labelPhase;
