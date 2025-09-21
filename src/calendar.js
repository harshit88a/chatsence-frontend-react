// utils/calendar.js
export function generateICS(event) {
	const formatDate = (date) =>
		date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

	const startDate = new Date(event.start_date);
	const endDate = new Date(event.end_date);

	return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Calendar Assistant//Event//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@ai-calendar.local
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ""}
LOCATION:${event.location || ""}
DTSTAMP:${formatDate(new Date())}
END:VEVENT
END:VCALENDAR`;
}

export function createCalendarLink(service, event) {
	const startDate = new Date(event.start_date);
	const endDate = new Date(event.end_date);

	const formatGoogleDate = (date) =>
		date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

	switch (service) {
		case "google":
			return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
				event.title
			)}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(
				endDate
			)}&details=${encodeURIComponent(event.description || "")}&location=${encodeURIComponent(
				event.location || ""
			)}`;
		case "outlook":
			return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
				event.title
			)}&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=${encodeURIComponent(
				event.description || ""
			)}&location=${encodeURIComponent(event.location || "")}`;
		default:
			return "#";
	}
}

export function downloadICS(content, filename) {
	const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
