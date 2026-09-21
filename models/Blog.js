const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  excerpt: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    default: 'TDC USA Team',
  },
  category: {
    type: String,
    enum: ['Technology', 'Business', 'Innovation', 'Industry'],
    default: 'Technology',
  },
  image: {
    type: String,
    default: '',
  },
  featuredImage: {
    type: String,
    default: '',
  },
  // Store Cloudinary public ID for easy deletion
  cloudinaryPublicId: {
    type: String,
    default: '',
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Draft',
  },
  readTime: {
    type: String,
    default: '5 min read',
  },
  tags: [String],
  publishedDate: {
    type: Date,
    default: Date.now,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

blogSchema.pre('validate', async function(next) {
  if (this.title && (!this.slug || this.slug.trim() === '')) {
    let baseSlug = slugify(this.title);
    let uniqueSlug = baseSlug;
    let count = 1;
    const Blog = this.constructor;
    while (true) {
      const existing = await Blog.findOne({ slug: uniqueSlug, _id: { $ne: this._id } });
      if (!existing) {
        break;
      }
      uniqueSlug = `${baseSlug}-${count}`;
      count++;
    }
    this.slug = uniqueSlug;
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);