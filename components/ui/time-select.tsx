import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tạo danh sách giờ từ 00:00 đến 23:30, cách nhau 30 phút
const generateTimeOptions = () => {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = String(hour).padStart(2, "0");
      const minuteStr = String(minute).padStart(2, "0");
      times.push(`${hourStr}:${minuteStr}`);
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

export function TimeSelect({
  value,
  onValueChange,
  placeholder = "Chọn giờ",
  disabled,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {TIME_OPTIONS.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

