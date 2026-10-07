import type { BloodGroup } from "@/lib/donor";

// Donor ka group -> kin patients ko blood de sakta hai
const CAN_GIVE_TO: Record<BloodGroup, BloodGroup[]> = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

export function canDonateTo(donor: BloodGroup, patient: BloodGroup): boolean {
  return CAN_GIVE_TO[donor].includes(patient);
}