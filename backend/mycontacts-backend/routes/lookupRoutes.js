const express = require('express');
const router = express.Router();
const {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getGroupedSkills
} = require('../controllers/lookupController');
const validateToken = require('../middleware/validateTokenHandler');
const authorizeRoles = require('../middleware/authorizeRoles');

// Allow public GET, but restrict POST/PUT/DELETE to admin/manager
const requireAdminOrManager = [validateToken, authorizeRoles('admin', 'manager')];

// Special endpoint for skills - MUST be registered before /:category
/**
 * @swagger
 * /api/lookups/special/grouped-skills:
 *   get:
 *     tags: [Lookups]
 *     summary: Get grouped skills
 *     responses:
 *       200:
 *         description: Successfully retrieved grouped skills
 */
router.get('/special/grouped-skills', getGroupedSkills);

// CRUD routes for lookup categories
/**
 * @swagger
 * /api/lookups/{category}:
 *   get:
 *     tags: [Lookups]
 *     summary: Get all items for a category
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of category items
 *   post:
 *     tags: [Lookups]
 *     summary: Create a new item for a category (Admin/Manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item created
 */
router.route('/:category')
  .get(getItems)
  .post(requireAdminOrManager, createItem);

/**
 * @swagger
 * /api/lookups/{category}/{id}:
 *   put:
 *     tags: [Lookups]
 *     summary: Update an item in a category (Admin/Manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item updated
 *   delete:
 *     tags: [Lookups]
 *     summary: Delete an item from a category (Admin/Manager only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deleted
 */
router.route('/:category/:id')
  .put(requireAdminOrManager, updateItem)
  .delete(requireAdminOrManager, deleteItem);

module.exports = router;
