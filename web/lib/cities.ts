export type City = { name: string; lat: number; lng: number };

/** Starting points for "near me" style searches when location access is off. */
export const CITIES: City[] = [
  { name: "Delhi NCR", lat: 28.6139, lng: 77.209 }, { name: "Mumbai", lat: 19.076, lng: 72.8777 },
  { name: "Bengaluru", lat: 12.9716, lng: 77.5946 }, { name: "Hyderabad", lat: 17.385, lng: 78.4867 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 }, { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
  { name: "Pune", lat: 18.5204, lng: 73.8567 }, { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 }, { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 }, { name: "Kochi", lat: 9.9312, lng: 76.2673 },
  { name: "Guwahati", lat: 26.1445, lng: 91.7362 }, { name: "Dehradun", lat: 30.3165, lng: 78.0322 },
];
