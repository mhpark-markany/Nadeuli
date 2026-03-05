export const queryKeys = {
	dashboard: (lat: number, lng: number) => ["dashboard", lat, lng] as const,
	places: (lat: number, lng: number) => ["places", lat, lng] as const,
	festivals: (lat: number, lng: number) => ["festivals", lat, lng] as const,
	address: (lat: number, lng: number) => ["address", lat, lng] as const,
};
