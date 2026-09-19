import { Router } from "express";
import {
    AddOrder,
    OrdersList,
    OrdersListByUser,
    getSingleOrder,
    deleteSingleOrder,
    updateOrderDetails,
    AddConsultation,
    ConsultationsList,
    updateConsultation,
    deleteSingleConsultation
} from "../Controllers/order.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router()

//custumer can post orders
router.route("/addOrder").post(
    // verifyJWT, 
    AddOrder)



// loged in Admin can get
router.route("/orders-list").get(
    // verifyJWT,
    OrdersList);

//loged-in user can get his orders

router.route("/user-orders").get(verifyJWT, OrdersListByUser);
router.route("/single-Order/:orderId").get(verifyJWT, getSingleOrder);
router.route("/delete-Order/:orderId").delete(
    // verifyJWT,
    deleteSingleOrder)//just for testing  
router.route("/update-Order/:editingOrderId").patch(
    // verifyJWT, 
    updateOrderDetails);



//Private Consultations Ro  
router.route("/addConsultation").post(
    // verifyJWT, 
    AddConsultation)
router.route("/consultations-list").get(
    // verifyJWT,
    ConsultationsList
);
router.route("/delete-Consultation/:consultationId").delete(
    // verifyJWT,
    deleteSingleConsultation
)//just for testing   
router.route("/update-Consultation/:consultationId").patch(
    // verifyJWT, 
    updateConsultation
);
export default router