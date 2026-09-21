import AppDatePicker, { type AppDatePickerProps } from "./AppDatePicker";

export type AppDateTimePickerProps = Omit<AppDatePickerProps, "mode">;

export default function AppDateTimePicker(props: AppDateTimePickerProps) {
  return <AppDatePicker {...props} mode="datetime" presetType="appointment" />;
}

export { AppDatePicker };
