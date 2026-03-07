"use client";

interface VisitedCountriesListProps {
  countries: Set<string>;
}

export default function VisitedCountriesList({ countries }: VisitedCountriesListProps) {
  if (countries.size === 0) {
    return (
      <p className="text-gray-600">You haven&apos;t visited any countries yet.</p>
    );
  }
  const sorted = Array.from(countries).sort();
  return (
    <div>
      <ul className="space-y-2 text-gray-600">
        {sorted.slice(0, 5).map((country) => (
          <li
            key={country}
            className="bg-gray-50 p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            {country}
          </li>
        ))}
      </ul>
      {sorted.length > 5 && (
        <p className="text-sm text-gray-500 mt-2">...and {sorted.length - 5} more.</p>
      )}
    </div>
  );
}
