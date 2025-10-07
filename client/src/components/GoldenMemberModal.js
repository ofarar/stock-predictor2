import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const GoldenMemberModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [price, setPrice] = useState(5);
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (user) {
            setPrice(user.goldenMemberPrice || 5);
            setDescription(user.goldenMemberDescription || 'Get exclusive insights and support my predictions!');
        }
    }, [user]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const settings = {
            isGoldenMember: true,
            price: parseFloat(price),
            description: description,
        };
        axios.put(`${process.env.REACT_APP_API_URL}/api/profile/golden-member`, settings, { withCredentials: true })
            .then(() => {
                toast.success('Golden Member status activated!');
                onUpdate(); // This will tell ProfilePage to refetch data
                onClose();
            })
            .catch(err => {
                toast.error('Failed to update settings.');
            });
    };
    
    const handleDeactivate = () => {
         const settings = { isGoldenMember: false, price, description };
         axios.put(`${process.env.REACT_APP_API_URL}/api/profile/golden-member`, settings, { withCredentials: true })
            .then(() => {
                toast.success('Golden Member status deactivated.');
                onUpdate();
                onClose();
            })
            .catch(err => {
                toast.error('Failed to update settings.');
            });
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-gray-300" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-4">Golden Member Settings</h2>
                <p className="text-sm mb-6">Allow other users to subscribe to you for a monthly fee. This is a great way to share your insights and get rewarded for your accuracy.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-300">Monthly Subscription Price ($)</label>
                        <input type="number" name="price" id="price" min="1" step="1" value={price} onChange={e => setPrice(e.target.value)}
                            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description (What subscribers get)</label>
                        <textarea name="description" id="description" rows="3" value={description} onChange={e => setDescription(e.target.value)}
                            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" placeholder="e.g., Access to my weekly stock analysis."></textarea>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-md hover:bg-yellow-400 transition-colors">
                            {user.isGoldenMember ? 'Update Settings' : 'Activate Golden Status'}
                        </button>
                        {user.isGoldenMember && (
                             <button type="button" onClick={handleDeactivate} className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-700 transition-colors">
                                Deactivate
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GoldenMemberModal;