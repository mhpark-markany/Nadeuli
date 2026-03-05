function roundCoord(v: number): number {
	return Math.round(v * 100) / 100;
}

export const queryKeys = {
	dashboard: (lat: number, lng: number) => ["dashboard", roundCoord(lat), roundCoord(lng)] as const,
	places: (lat: number, lng: number) => ["places", roundCoord(lat), roundCoord(lng)] as const,
	festivals: (lat: number, lng: number) => ["festivals", roundCoord(lat), roundCoord(lng)] as const,
	address: (lat: number, lng: number) => ["address", roundCoord(lat), roundCoord(lng)] as const,
};
