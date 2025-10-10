import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ContactPage = () => {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.message) {
            toast.error('Please fill out all fields.');
            return;
        }
        setIsSubmitting(true);
        axios.post(`${process.env.REACT_APP_API_URL}/api/contact`, formData)
            .then(() => {
                toast.success('Your message has been sent!');
                setFormData({ name: '', email: '', message: '' });
            })
            .catch(() => toast.error('Something went wrong. Please try again.'))
            .finally(() => setIsSubmitting(false));
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in text-gray-300">
            <h1 className="text-4xl font-bold text-white text-center mb-8">Contact Us</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold text-green-400">Get in Touch</h2>
                    <p>
                        Have a question, feedback, or a partnership inquiry? We'd love to hear from you.
                        Fill out the form, and we'll get back to you as soon as possible.
                    </p>
                    <p>
                        For urgent matters, you can also reach us directly at:
                        <a href="mailto:predictostock@gmail.com" className="font-bold text-green-400 hover:underline ml-2">
                            predictostock@gmail.com
                        </a>
                    </p>
                </div>

                <div className="bg-gray-800 p-8 rounded-lg">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Your Name</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Your Email</label>
                            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-300">Message</label>
                            <textarea name="message" id="message" rows="5" value={formData.message} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"></textarea>
                        </div>
                        <div className="text-right">
                             <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 disabled:bg-gray-500">
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;