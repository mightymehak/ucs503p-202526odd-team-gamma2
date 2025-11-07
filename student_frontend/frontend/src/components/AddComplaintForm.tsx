// src/components/AddComplaintForm.tsx

import React, { useState } from "react";
import { User, Complaint } from "../types/types";

interface AddComplaintFormProps {
  user: User;
  onClose: () => void;
  onSubmit: () => void;
}

const AddComplaintForm: React.FC<AddComplaintFormProps> = ({ onClose, onSubmit }) => {
  const [category, setCategory] = useState<string>("");
  const [itemName, setItemName] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [dateFound, setDateFound] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const newComplaint: Complaint = {
      id: Date.now(),
      category,
      itemName,
      location,
      dateFound,
      photo: photo ? URL.createObjectURL(photo) : null,
    };

    console.log("New complaint:", newComplaint);

    // Reset form
    setCategory("");
    setItemName("");
    setLocation("");
    setDateFound("");
    setPhoto(null);

    // Call onSubmit callback
    onSubmit();
  };

  const handleCancel = () => {
    setCategory("");
    setItemName("");
    setLocation("");
    setDateFound("");
    setPhoto(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-xl p-6 w-full max-w-md mx-auto"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Add Lost Item</h2>

        <label className="block mb-2 font-semibold">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
          required
        >
          <option value="">Select category</option>
          <option value="Electronics">Electronics</option>
          <option value="Books">Books</option>
          <option value="Clothing">Clothing</option>
          <option value="Accessories">Accessories</option>
          <option value="Others">Others</option>
        </select>

        <label className="block mb-2 font-semibold">Item Name</label>
        <input
          type="text"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
          required
        />

        <label className="block mb-2 font-semibold">Location Found</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
          required
        />

        <label className="block mb-2 font-semibold">Date Found</label>
        <input
          type="date"
          value={dateFound}
          onChange={(e) => setDateFound(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
          required
        />

        <label className="block mb-2 font-semibold">Upload Photo</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
          className="w-full mb-4"
        />

        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Item
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddComplaintForm;