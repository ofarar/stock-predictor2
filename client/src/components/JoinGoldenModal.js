import React from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const JoinGoldenModal = ({ isOpen, onClose, goldenMember, onUpdate }) => {
    if (!isOpen) return null;

    const handleJoin = () => {
        axios.post(`${process.env.REACT_APP_API_URL}/api/users/${goldenMember._id}/join-golden`, {}, { withCredentials: true })
            .then(() => {
                toast.success(`You are now subscribed to ${goldenMember.username}!`);
                onUpdate(); // Refetch profile data
                onClose();
            })
            .catch(err => {
                toast.error('Failed to join. Please try again.');
            });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 animate-fade-in-fast" onClick={onClose}>
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-gray-300" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Join {goldenMember.username}'s Subscribers</h2>
                    <p className="text-lg font-bold text-yellow-400 mb-4">${goldenMember.goldenMemberPrice} / month</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg mb-6">
                    <p className="font-bold text-white mb-2">What you get:</p>
                    <p className="text-sm">{goldenMember.goldenMemberDescription || "No description provided."}</p>
                </div>
                <button onClick={handleJoin} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 transition-colors">
                    Join Now
                </button>
            </div>
        </div>
    );
};

export default JoinGoldenModal;