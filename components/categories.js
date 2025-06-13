// categories.js
// This file contains the categories for item and service listings

export const categories = [
    { 
      id: "electronics", 
      name: "Electronics",
      icon: "laptop",
      subCategories: [
        "Smartphones & Accessories",
        "Computers & Tablets",
        "TV & Home Entertainment",
        "Audio Equipment",
        "Cameras & Photography",
        "Gaming Consoles & Accessories",
        "Wearable Technology",
        "Other Electronics"
      ]
    },
    { 
      id: "home-furniture", 
      name: "Home and Furniture",
      icon: "home",
      subCategories: [
        "Living Room Furniture",
        "Bedroom Furniture",
        "Kitchen & Dining",
        "Home Decor",
        "Appliances",
        "Storage & Organization",
        "Lighting",
        "Garden & Outdoor"
      ]
    },
    { 
      id: "clothing-accessories", 
      name: "Clothing and Accessories",
      icon: "shopping-bag",
      subCategories: [
        "Men's Clothing",
        "Women's Clothing",
        "Children's Clothing",
        "Shoes & Footwear",
        "Bags & Purses",
        "Jewelry & Watches",
        "Fashion Accessories",
        "Vintage & Collectible"
      ]
    },
    { 
      id: "books-media", 
      name: "Books and Media",
      icon: "book",
      subCategories: [
        "Books",
        "Textbooks",
        "Magazines & Comics",
        "Movies & TV Shows",
        "Music & Vinyl",
        "Video Games",
        "Board Games",
        "Educational Materials"
      ]
    },
    { 
      id: "toys-games", 
      name: "Toys and Games",
      icon: "gamepad",
      subCategories: [
        "Action Figures & Collectibles",
        "Board Games & Puzzles",
        "Building Toys",
        "Dolls & Stuffed Animals",
        "Educational Toys",
        "Outdoor Play Equipment",
        "Remote Control Toys",
        "Vintage & Classic Toys"
      ]
    },
    { 
      id: "sports-outdoors", 
      name: "Sports and Outdoors",
      icon: "futbol-o",
      subCategories: [
        "Exercise & Fitness",
        "Team Sports Equipment",
        "Outdoor Recreation",
        "Camping & Hiking",
        "Cycling",
        "Water Sports",
        "Winter Sports",
        "Sports Clothing & Accessories"
      ]
    },
    { 
      id: "tools-equipment", 
      name: "Tools and Equipment",
      icon: "wrench",
      subCategories: [
        "Power Tools",
        "Hand Tools",
        "Garden Tools",
        "Construction Equipment",
        "Measuring & Layout Tools",
        "Workwear & Safety Equipment",
        "Tool Storage",
        "Specialty Tools"
      ]
    },
    { 
      id: "automotive", 
      name: "Automotive",
      icon: "car",
      subCategories: [
        "Car Parts & Accessories",
        "Motorcycle Parts & Gear",
        "Automotive Tools",
        "Car Electronics",
        "Tires & Wheels",
        "Vehicle Maintenance",
        "Automotive Care",
        "Other Vehicles"
      ]
    },
    { 
      id: "health-beauty", 
      name: "Health and Beauty",
      icon: "medkit",
      subCategories: [
        "Skincare",
        "Makeup & Cosmetics",
        "Hair Care",
        "Fragrances",
        "Health Products",
        "Personal Care",
        "Beauty Devices",
        "Natural & Organic"
      ]
    },
    { 
      id: "musical-instruments", 
      name: "Musical Instruments",
      icon: "music",
      subCategories: [
        "String Instruments",
        "Percussion",
        "Wind Instruments",
        "Keyboard Instruments",
        "DJ & Production Equipment",
        "Accessories & Parts",
        "Vintage Instruments",
        "Recording Equipment"
      ]
    },
    { 
      id: "collectibles-antiques", 
      name: "Collectibles and Antiques",
      icon: "trophy",
      subCategories: [
        "Coins & Currency",
        "Stamps",
        "Trading Cards",
        "Memorabilia",
        "Vintage Items",
        "Art & Artifacts",
        "Antique Furniture",
        "Rare & Limited Items"
      ]
    },
    { 
      id: "web-development", 
      name: "Web and Software Development",
      icon: "code",
      subCategories: [
        "Web Design",
        "Front-end Development",
        "Back-end Development",
        "Full Stack Development",
        "Mobile App Development",
        "CMS Development",
        "E-commerce Development",
        "API Integration"
      ]
    },
    { 
      id: "graphic-design", 
      name: "Graphic and Design",
      icon: "paint-brush",
      subCategories: [
        "Logo Design",
        "Brand Identity",
        "Illustration",
        "Print Design",
        "UI/UX Design",
        "Packaging Design",
        "Presentation Design",
        "3D Design"
      ]
    },
    { 
      id: "writing-translation", 
      name: "Writing and Translation",
      icon: "pencil",
      subCategories: [
        "Content Writing",
        "Copywriting",
        "Translation",
        "Editing & Proofreading",
        "Resume & Cover Letters",
        "Technical Writing",
        "Creative Writing",
        "Transcription"
      ]
    },
    { 
      id: "digital-marketing", 
      name: "Digital Marketing",
      icon: "line-chart",
      subCategories: [
        "Social Media Marketing",
        "SEO",
        "SEM & PPC",
        "Email Marketing",
        "Content Marketing",
        "Influencer Marketing",
        "Analytics & Strategy",
        "Affiliate Marketing"
      ]
    },
    { 
      id: "video-animation", 
      name: "Video and Animation",
      icon: "film",
      subCategories: [
        "Video Editing",
        "Animation",
        "Motion Graphics",
        "Video Production",
        "Visual Effects",
        "Whiteboard & Explainer Videos",
        "3D Animation",
        "Intro & Outro Videos"
      ]
    },
    { 
      id: "music-audio", 
      name: "Music and Audio",
      icon: "headphones",
      subCategories: [
        "Voice Over",
        "Mixing & Mastering",
        "Audio Production",
        "Songwriting",
        "Sound Effects",
        "Podcast Production",
        "Audio Editing",
        "Music Composition"
      ]
    },
    { 
      id: "business-services", 
      name: "Business Services",
      icon: "briefcase",
      subCategories: [
        "Business Planning",
        "Financial Consulting",
        "Legal Consulting",
        "Market Research",
        "Virtual Assistance",
        "Project Management",
        "HR Consulting",
        "Business Coaching"
      ]
    },
    { 
      id: "lifestyle-services", 
      name: "Lifestyle Services",
      icon: "heart",
      subCategories: [
        "Event Planning",
        "Pet Services",
        "Personal Shopping",
        "Interior Design",
        "Cooking & Recipes",
        "Wellness & Fitness",
        "Travel Planning",
        "Tutoring & Education"
      ]
    },
    { 
      id: "photography-videography", 
      name: "Photography and Videography",
      icon: "camera",
      subCategories: [
        "Portrait Photography",
        "Product Photography",
        "Real Estate Photography",
        "Event Photography",
        "Documentary Videography",
        "Commercial Videography",
        "Photo Editing",
        "Drone Photography & Videography"
      ]
    },
    {
      id: "crafts-handmade",
      name: "Crafts and Handmade",
      icon: "scissors",
      subCategories: [
        "Handmade Jewelry",
        "Knitting & Crochet",
        "Woodworking",
        "Pottery & Ceramics",
        "Paper Crafts",
        "Candles & Soaps",
        "Sewing & Textile Arts",
        "Custom Artwork"
      ]
    },
    {
      id: "baby-kids",
      name: "Baby and Kids",
      icon: "child",
      subCategories: [
        "Baby Clothing",
        "Toys & Games",
        "Strollers & Car Seats",
        "Nursery & Furniture",
        "Feeding & Nursing",
        "Diapering & Potty",
        "Baby Gear",
        "Children's Books"
      ]
    },
    {
      id: "pet-supplies",
      name: "Pet Supplies",
      icon: "paw",
      subCategories: [
        "Dog Supplies",
        "Cat Supplies",
        "Fish & Aquarium",
        "Bird Supplies",
        "Small Animal Supplies",
        "Pet Food & Treats",
        "Pet Furniture",
        "Pet Clothing & Accessories"
      ]
    },
    {
      id: "education-courses",
      name: "Education and Courses",
      icon: "graduation-cap",
      subCategories: [
        "Online Courses",
        "Tutoring",
        "Language Learning",
        "Test Preparation",
        "Professional Certification",
        "Skill Development",
        "Educational Materials",
        "Workshops & Training"
      ]
    }
  ];
  
  // Helper functions for working with categories
  
  /**
   * Get a category by its ID
   * @param {string} id - The category ID
   * @returns {Object|undefined} The category object or undefined if not found
   */
  export const getCategoryById = (id) => {
    return categories.find(category => category.id === id);
  };
  
  /**
   * Get all subcategories for a given category ID
   * @param {string} categoryId - The category ID
   * @returns {Array} Array of subcategories or empty array if category not found
   */
  export const getSubcategoriesForCategory = (categoryId) => {
    const category = getCategoryById(categoryId);
    return category ? category.subCategories : [];
  };
  
  /**
   * Get all categories formatted for a picker component
   * @returns {Array} Array of objects with label and value properties
   */
  export const getCategoriesForPicker = () => {
    return categories.map(category => ({
      label: category.name,
      value: category.id
    }));
  };
  
  /**
   * Search categories by query string
   * @param {string} query - The search query
   * @returns {Array} Matching categories
   */
  export const searchCategories = (query) => {
    if (!query || typeof query !== 'string') return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    
    return categories.filter(category => {
      // Check main category name
      if (category.name.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      
      // Check subcategories
      return category.subCategories.some(
        sub => sub.toLowerCase().includes(normalizedQuery)
      );
    });
  };
  
  export default categories;