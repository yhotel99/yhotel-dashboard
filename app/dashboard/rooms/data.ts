// Room data type
export type Room = {
  id: string
  number: string
  type: string
  status: "available" | "occupied" | "maintenance"
  price: number
  floor: number
  capacity: number
  amenities: string[]
}

// Sample data
export const roomsData: Room[] = [
  {
    id: "1",
    number: "101",
    type: "Standard",
    status: "available",
    price: 500000,
    floor: 1,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "2",
    number: "102",
    type: "Deluxe",
    status: "occupied",
    price: 800000,
    floor: 1,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "3",
    number: "201",
    type: "Suite",
    status: "available",
    price: 1200000,
    floor: 2,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
  {
    id: "4",
    number: "202",
    type: "Standard",
    status: "maintenance",
    price: 500000,
    floor: 2,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "5",
    number: "301",
    type: "Deluxe",
    status: "available",
    price: 800000,
    floor: 3,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "6",
    number: "302",
    type: "Suite",
    status: "occupied",
    price: 1200000,
    floor: 3,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
  {
    id: "7",
    number: "401",
    type: "Standard",
    status: "available",
    price: 500000,
    floor: 4,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "8",
    number: "402",
    type: "Deluxe",
    status: "available",
    price: 800000,
    floor: 4,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "9",
    number: "501",
    type: "Suite",
    status: "occupied",
    price: 1200000,
    floor: 5,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
  {
    id: "10",
    number: "502",
    type: "Standard",
    status: "available",
    price: 500000,
    floor: 5,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "11",
    number: "601",
    type: "Deluxe",
    status: "maintenance",
    price: 800000,
    floor: 6,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "12",
    number: "602",
    type: "Suite",
    status: "available",
    price: 1200000,
    floor: 6,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
  {
    id: "13",
    number: "701",
    type: "Standard",
    status: "occupied",
    price: 500000,
    floor: 7,
    capacity: 2,
    amenities: ["WiFi", "TV"],
  },
  {
    id: "14",
    number: "702",
    type: "Deluxe",
    status: "available",
    price: 800000,
    floor: 7,
    capacity: 2,
    amenities: ["WiFi", "TV", "Mini Bar"],
  },
  {
    id: "15",
    number: "801",
    type: "Suite",
    status: "available",
    price: 1200000,
    floor: 8,
    capacity: 4,
    amenities: ["WiFi", "TV", "Mini Bar", "Balcony"],
  },
]

// Helper function to get room by ID
export function getRoomById(id: string): Room | undefined {
  return roomsData.find((room) => room.id === id)
}

