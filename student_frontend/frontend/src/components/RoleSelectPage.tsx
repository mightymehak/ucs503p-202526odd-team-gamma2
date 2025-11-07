// src/components/RoleSelectPage.tsx
import React from "react";
import { Role } from "../types/types";

interface RoleSelectPageProps {
  onSelectRole: (role: Role) => void;
}

function RoleSelectPage({ onSelectRole }: RoleSelectPageProps) {
  return (
    // 1. Replaced old gradient with new custom background class
    <div className="min-h-screen flex flex-col items-center justify-center bg-lost-and-found-pattern p-4">
      <div className="text-center space-y-12 z-10 p-6">
        
        {/* Header */}
        <div className="space-y-3 animate-fade-in">
          {/* 2. Search Icon: Removed white background circle, changed color to brand purple */}
          <div className="inline-block mb-4">
            <svg 
              className="w-10 h-10 md:w-16 md:h-16 text-brand-purple" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          
          {/* 3. Heading: Changed text color to brand purple */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-brand-purple tracking-wide">
            Lost & Found
          </h1>
          
          {/* 4. Sub-heading: Changed text color to a darker gray for contrast */}
          <p className="text-lg md:text-xl text-gray-700 font-medium">
            Welcome to the Lost & Found Portal
          </p>
          
          {/* 5. Divider: Changed color to match the brand purple (subtle) */}
          <div className="w-16 h-0.5 bg-brand-purple/50 mx-auto rounded-full"></div>
        </div>

        {/* Buttons */}
        {/* Added margin top for better vertical centering, increased gap */}
        <div className="flex flex-col md:flex-row gap-8 justify-center items-center mt-12">
          {/* Student Button */}
          <button
            onClick={() => onSelectRole("student")}
            // Updated card styles: added border, cleaner shadow, removed hover scale
            className="group relative overflow-hidden bg-white text-gray-900 px-10 py-6 rounded-xl transform transition-all duration-300 shadow-xl hover:shadow-2xl border border-gray-100 w-full md:w-auto min-w-[260px]"
          >
            {/* Hover overlay now uses a single brand purple color */}
            <div className="absolute inset-0 bg-brand-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative flex flex-col items-center space-y-3">
              {/* Icon color updated to brand purple */}
              <svg 
                className="w-10 h-10 text-brand-purple group-hover:text-white transition-colors duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                />
              </svg>
              
              <span className="text-xl font-bold group-hover:text-white transition-colors duration-300">
                Student Portal
              </span>
              
              <span className="text-sm text-gray-500 group-hover:text-white/80 transition-colors duration-300">
                Report & track lost items
              </span>
            </div>
          </button>

          {/* Admin Button */}
          <button
            onClick={() => onSelectRole("admin")}
            // Updated card styles
            className="group relative overflow-hidden bg-white text-gray-900 px-10 py-6 rounded-xl transform transition-all duration-300 shadow-xl hover:shadow-2xl border border-gray-100 w-full md:w-auto min-w-[260px]"
          >
            {/* Hover overlay now uses a single brand purple color */}
            <div className="absolute inset-0 bg-brand-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative flex flex-col items-center space-y-3">
              {/* Icon color updated to brand purple */}
              <svg 
                className="w-10 h-10 text-brand-purple group-hover:text-white transition-colors duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              
              <span className="text-xl font-bold group-hover:text-white transition-colors duration-300">
                Admin Portal
              </span>
              
              <span className="text-sm text-gray-500 group-hover:text-white/80 transition-colors duration-300">
                Manage system & items
              </span>
            </div>
          </button>
        </div>

        {/* Footer */}
        {/* Adjusted text color for light background and removed footer dots/animation */}
        <div className="text-gray-500 text-sm space-y-2 pt-10">
          <p>Choose your role to continue</p>
          {/* Removed animated dots for cleaner look */}
        </div>
      </div>

      {/* 6. Removed unnecessary animated background elements */}
      {/* <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float-delayed"></div>
      </div> */}
    </div>
  );
}

export default RoleSelectPage;