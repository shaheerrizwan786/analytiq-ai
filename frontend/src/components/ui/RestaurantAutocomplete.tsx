'use client';

import { useState, useEffect, useRef } from 'react';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  url: string;
}

interface RestaurantAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (details: PlaceDetails) => void;
  isDisabled?: boolean;
  label?: string;
  placeholder?: string;
  contextQuery?: string;
  dropdownDirection?: 'up' | 'down';
}

export default function RestaurantAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  isDisabled = false,
  label = 'Restaurant Name',
  placeholder = 'e.g. Starbucks, McDonald\'s',
  contextQuery = '',
  dropdownDirection = 'down',
}: RestaurantAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions when user types
  useEffect(() => {
    // Only show suggestions when input is focused
    if (!isFocused) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const searchQuery = contextQuery
          ? `${trimmed} ${contextQuery}`.trim()
          : trimmed;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/places/autocomplete?input=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.predictions || []);
          setShowDropdown(true);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, contextQuery, isFocused]);

  function handleSelectPlace(placeId: string, description: string) {
    setShowDropdown(false);
    setSuggestions([]);

    const mainText = description.split(',')[0].trim();
    const addressParts = description.split(',').slice(1).map(s => s.trim()).join(', ');

    onPlaceSelect?.({
      place_id: placeId,
      name: mainText,
      formatted_address: addressParts || description,
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(description)}&query_place_id=${placeId}`,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      handleSelectPlace(selected.place_id, selected.description);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setIsFocused(false), 200);
          }}
          disabled={isDisabled}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 text-sm bg-white dark:bg-[#1E1E2E] border border-gray-200 dark:border-[#2A2A3C] rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:ring-violet-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="animate-spin h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className={`absolute z-50 w-full ${dropdownDirection === 'up' ? 'bottom-full mb-1' : 'mt-1'} bg-white dark:bg-[#1E1E2E] border border-gray-200 dark:border-[#2A2A3C] rounded-lg shadow-lg max-h-60 overflow-y-auto`}>
          {suggestions.map((suggestion, index) => {
            const mainText = suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0];
            const secondaryText = suggestion.structured_formatting?.secondary_text || suggestion.description.split(',').slice(1).join(',').trim();

            return (
              <button
                key={suggestion.place_id}
                onClick={() => handleSelectPlace(suggestion.place_id, suggestion.description)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#2A2A3C] transition-colors border-b border-gray-100 dark:border-[#2A2A3C] last:border-b-0 ${
                  index === selectedIndex ? 'bg-gray-50 dark:bg-[#2A2A3C]' : ''
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {mainText}
                </div>
                {secondaryText && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {secondaryText}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
