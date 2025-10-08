// src/pages/EditProfilePage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AvatarSelectionModal from '../components/AvatarSelectionModal'; // Import the new modal

const EditProfilePage = ({ onProfileUpdate }) => {
    const [formData, setFormData] = useState({
        username: '', about: '', youtubeLink: '', xLink: '', avatar: ''
    });
    const [user, setUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false); // State for the modal
    const navigate = useNavigate();

    const CHARACTER_LIMIT = 300;

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => {
                if (res.data) {
                    setUser(res.data);
                    setFormData({
                        username: res.data.username || 'User',
                        about: res.data.about || '',
                        youtubeLink: res.data.youtubeLink || '',
                        xLink: res.data.xLink || '',
                        avatar: res.data.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${res.data.username}`
                    });
                } else {
                    navigate('/login');
                }
            });
    }, [navigate]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSaveAvatar = (newAvatarUrl) => {
        setFormData(prev => ({ ...prev, avatar: newAvatarUrl }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        axios.put(`${process.env.REACT_APP_API_URL}/api/profile`, formData, { withCredentials: true })
            .then(() => {
                toast.success('Profile updated successfully!');
                onProfileUpdate();
                navigate(`/profile/${user._id}`);
            })
            .catch(() => toast.error('Failed to update profile.'))
            .finally(() => setIsSaving(false));
    };

    return (
        <>
            <AvatarSelectionModal
                isOpen={isAvatarModalOpen}
                onClose={() => setIsAvatarModalOpen(false)}
                onSave={handleSaveAvatar}
                initialAvatarUrl={formData.avatar}
            />

            <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg">
                <h1 className="text-3xl font-bold text-white mb-6">Edit Your Profile</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* --- START: NEW COMPACT AVATAR UI --- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Avatar</label>
                        <div className="flex items-center gap-4">
                            <img
                                src={formData.avatar}
                                alt="Avatar Preview"
                                className="w-16 h-16 rounded-full bg-white flex-shrink-0"
                            />
                            <button 
                                type="button"
                                onClick={() => setIsAvatarModalOpen(true)}
                                className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700"
                            >
                                Change Avatar
                            </button>
                        </div>
                    </div>
                    {/* --- END: NEW COMPACT AVATAR UI --- */}

                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-300">Username</label>
                        <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>
                    <div>
                        <label htmlFor="about" className="block text-sm font-medium text-gray-300">About</label>
                        <textarea name="about" id="about" rows="4" value={formData.about} onChange={handleChange} maxLength={CHARACTER_LIMIT} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"></textarea>
                        <p className="text-right text-xs text-gray-400 mt-1">{formData.about.length} / {CHARACTER_LIMIT}</p>
                    </div>
                    <div>
                        <label htmlFor="xLink" className="block text-sm font-medium text-gray-300">X (Twitter) Link</label>
                        <input type="url" name="xLink" id="xLink" placeholder="https://x.com/yourprofile" value={formData.xLink} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>
                    <div>
                        <label htmlFor="youtubeLink" className="block text-sm font-medium text-gray-300">YouTube Link</label>
                        <input type="url" name="youtubeLink" id="youtubeLink" placeholder="https://youtube.com/yourchannel" value={formData.youtubeLink} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>

                    <div className="flex flex-col sm:flex-row-reverse gap-4 pt-4 border-t border-gray-700">
                        <button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 disabled:bg-gray-500">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto bg-gray-600 text-white font-bold py-3 px-6 rounded-md hover:bg-gray-700">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default EditProfilePage;