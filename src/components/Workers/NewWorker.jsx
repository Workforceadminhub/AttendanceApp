import React, { useState } from "react";
import Form from "../Form";
import { toast } from "react-toastify";
import { validateEmail } from "../../utils/validate";
import Layout from "../Layout";
import { addNewWorker } from "../../services/workers";

function NewWorker() {
  const newWorker = {
    firstname: "",
    lastname: "",
    othername: "",
    email: "",
    phonenumber: "",
    maritalstatus: "",
    gender: "",
    birthdate: "",
    agerange: "",
    employment: "",
    team: "",
    department: "",
    workerrole: "",
  };
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(newWorker);

  const handleSubmit = async () => {
    const requiredFields = [
      "firstname",
      "lastname",
      "email",
      "phonenumber",
      "gender",
      "maritalstatus",
      "birthdate",
      "agerange",
      "employment",
      "team",
      "department",
      "workerrole",
    ];

    for (let field of requiredFields) {
      if (!formData[field]) {
        toast.error("Some fields are missing");
        return;
      }
    }

    if (!validateEmail(formData.email)) {
      toast.error("Invalid email address");
      return;
    }

    setIsLoading(true);
    // Proceed with form submission logic
    try {
      await addNewWorker(formData);
      setIsLoading(false);
      toast.success("Worker added successfully");
      setFormData(newWorker);
    } catch (error) {
      toast.error("Error adding worker: " + error);
      setIsLoading(false);
      setFormData(newWorker);
    }
  };

  return (
    <Layout>
      <div className="mt-12 px-[20%]">
        <Form
          formData={formData}
          handleSubmit={handleSubmit}
          setFormData={setFormData}
          isActive
          isLoading={isLoading}
        />
      </div>
    </Layout>
  );
}

export default NewWorker;
