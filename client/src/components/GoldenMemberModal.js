// src/components/GoldenMemberModal.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GoldenMemberModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [price, setPrice] = useState(5);
    const [description, setDescription] = useState('');
    const [acceptingNew, setAcceptingNew] = useState(true);

    useEffect(() => {
        if (user) {
            setPrice(user.goldenMemberPrice || 5);
            setDescription(user.goldenMemberDescription || 'Get exclusive insights and support my predictions!');
            setAcceptingNew(user.acceptingNewSubscribers !== false);
        }
    }, [user]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const settings = {
            isGoldenMember: true,
            price: parseFloat(price),
            description: description,
            acceptingNewSubscribers: acceptingNew,
        };

        // --- LOGGING ---
        console.log("Frontend: Sending these settings to the server:", settings);
        // ---------------

        axios.put(`${process.env.REACT_APP_API_URL}/api/profile/golden-member`, settings, { withCredentials: true })
            .then(() => {
                toast.success('Golden Member settings updated!');
                onUpdate();
                onClose();
            })
            .catch(err => {
                toast.error(err.response?.data?.message || 'Failed to update settings.');
            });
    };
    
    const handleDeactivate = () => {
         const settings = { 
            isGoldenMember: false, 
            price, 
            description, 
            acceptingNewSubscribers: acceptingNew 
         };
         // --- LOGGING ---
         console.log("Frontend: Sending DEACTIVATION settings:", settings);
         // ---------------
         axios.put(`${process.env.REACT_APP_API_URL}/api/profile/golden-member`, settings, { withCredentials: true })
            .then(() => {
                toast.success('Golden Member status deactivated.');
                onUpdate();
                onClose();
            })
            .catch(err => {
                toast.error(err.response?.data?.message || 'Failed to update settings.');
            });
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-gray-300" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
                <h2 className="text-2xl font-bold text-white mb-4">Golden Member Settings</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-300">Monthly Price ($1 - $500)</label>
                        <input type="number" name="price" id="price" min="1" max="500" step="1" value={price} onChange={e => setPrice(e.target.value)}
                            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                        <textarea name="description" id="description" rows="3" value={description} onChange={e => setDescription(e.target.value)}
                            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"></textarea>
                    </div>
                    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                        <label htmlFor="acceptingNew" className="text-sm font-medium text-gray-300">Accepting New Subscribers</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="acceptingNew" checked={acceptingNew} onChange={() => setAcceptingNew(!acceptingNew)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-md hover:bg-yellow-400">
                            {user.isGoldenMember ? 'Update Settings' : 'Activate Golden Status'}
                        </button>
                        {user.isGoldenMember && (
                             <button type="button" onClick={handleDeactivate} className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-700">Deactivate</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GoldenMemberModal;